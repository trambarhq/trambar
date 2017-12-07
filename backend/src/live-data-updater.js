var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');
var Shutdown = require('shutdown');

// accessors
var Statistics = require('accessors/statistics');
var Listing = require('accessors/listing');
var Project = require('accessors/project');
var Story = require('accessors/story');

// analysers
var DailyActivities = require('analysers/daily-activities');
var DailyNotifications = require('analysers/daily-notifications');
var ProjectDateRange = require('analysers/story-date-range');
var StoryPopularity = require('analysers/story-popularity');

// story raters
var ByPopularity = require('story-raters/by-popularity');
var ByRole = require('story-raters/by-role');
var ByType = require('story-raters/by-type');

var analysers = [
    DailyActivities,
    DailyNotifications,
    ProjectDateRange,
    StoryPopularity,
];
var storyRaters = [
    ByPopularity,
    ByRole,
    ByType,
];
var database;

function start() {
    return Database.open(true).then((db) => {
        database = db;
        return db.need('global').then(() => {
            return fetchDirtyStatistics(db);
        }).then(() => {
            return fetchDirtyListings(db);
        }).then(() => {
            var tables = [ 'listing', 'statistics' ];
            return db.listen(tables, 'clean', handleCleanRequests, 0);
        }).then(() => {
            // capture event for tables that the story raters are monitoring
            // (for the purpose of cache invalidation)
            var tables = _.filter(_.uniq(_.flatten(_.map(storyRaters, 'monitoring'))));
            return db.listen(tables, 'change', handleDatabaseChanges, 0);
        });
    });
}

function stop() {
    if (database) {
        database.close();
        database = null;
    }
    return Promise.resolve();
}

/**
 * Called by Postgres change notification triggers
 *
 * @param  {Array<Object>} events
 */
function handleCleanRequests(events) {
    // filter out events from other tests
    if (process.env.DOCKER_MOCHA) {
        events = _.filter(events, (event) => {
            return (event.schema === 'test:LiveDataUpdater');
        });
    }
    var now = new Date;
    _.each(events, (event) => {
        switch (event.table) {
            case 'statistics':
                addToStatisticsQueue(event.schema, event.id, event.atime);
                break;
            case 'listing':
                addToListingQueue(event.schema, event.id, event.atime);
                break;
        }
    })
}

/**
 * Fetch dirty statistics records from database and place them in update queues
 *
 * @param  {Database} db
 *
 * @return {Promise}
 */
function fetchDirtyStatistics(db) {
    return getProjectSchemas(db).each((schema) => {
        var criteria = { dirty: true, order: 'sample_count' };
        return Statistics.find(db, schema, criteria, 'id, atime').each((row) => {
            addToStatisticsQueue(schema, row.id, row.atime);
            return null;
        });
    });
}

/**
 * Fetch dirty listings from database and place them in update queues
 *
 * @param  {Database} db
 *
 * @return {Promise}
 */
function fetchDirtyListings(db) {
    return getProjectSchemas(db).each((schema) => {
        var criteria = { dirty: true };
        return Listing.find(db, schema, criteria, 'id, atime').each((row) => {
            addToListingQueue(schema, row.id, row.atime);
            return null;
        });
    });
}

var statisticsUpdateQueues = {
    high: [],
    medium: [],
    low: []
};

/**
 * Add statistics row to update queue, with priority based on how recently
 * it was accessed
 *
 * @param {String} schema
 * @param {Number} id
 * @param {String} atime
 */
function addToStatisticsQueue(schema, id, atime) {
    // use access time to determine priority of update
    var elapsed = getTimeElapsed(atime, new Date);
    var priority = 'low';
    if (elapsed < 10 * 1000) {
        // last accessed within 10 sec
        priority = 'high';
    } else if (elapsed < 15 * 60 * 1000) {
        // last accessed within 15 min
        priority = 'medium';
    }

    // push item onto queue unless it's already there
    var item = { schema, id };
    var queue = statisticsUpdateQueues[priority];
    if (!_.find(queue, item)) {
        queue.push(item);
    }

    // remove it from the other queues
    _.forIn(statisticsUpdateQueues, (otherQueue) => {
        if (otherQueue !== queue) {
            var index = _.find(otherQueue, item);
            if (index !== -1) {
                otherQueue.splice(index, 1);
            }
        }
    });
    processNextInStatisticsQueue();
}

var updatingStatistics = false;

/**
 * Process the next item in the statistics queues
 */
function processNextInStatisticsQueue() {
    if (updatingStatistics) {
        // already in the middle of something
        return;
    }
    var nextItem;
    _.each(statisticsUpdateQueues, (queue, priority) => {
        var nextItem = queue.shift();
        if (nextItem) {
            updatingStatistics = true;
            updateStatistics(nextItem.schema, nextItem.id).then((success) => {
                updatingStatistics = false;

                // delay the process of the next row depending on priority
                var delay = 0;
                switch (priority) {
                    case 'high': delay = 0; break;
                    case 'medium': delay = 100; break;
                    case 'low': delay = 500; break;
                }
                if (delay) {
                    setTimeout(processNextInStatisticsQueue, delay);
                } else {
                    setImmediate(processNextInStatisticsQueue);
                }
            }).catch((err) => {
                console.error(err)
                setImmediate(processNextInStatisticsQueue);
            });
            return false;
        }
    });
}

/**
 * Update a statistics row, identified by id
 *
 * @param  {String} schema
 * @param  {Number} id
 *
 * @return {Promise<Statistics>}
 */
function updateStatistics(schema, id) {
    return Database.open().then((db) => {
        // establish a lock on the row first, so multiple instances of this
        // script won't waste time performing the same work
        return Statistics.lock(db, schema, id, '1 minute', 'gn, type, filters').then((row) => {
            // regenerate the row
            var analyser = _.find(analysers, { type: row.type });
            if (!analyser) {
                throw new Error('Unknown statistics type: ' + row.type);
            }
            return analyser.generate(db, schema, row.filters).then((props) => {
                // save the new data and release the lock
                return Statistics.unlock(db, schema, id, props, 'gn');
            });
        }).finally(() => {
            return db.close();
        });
    });
}

var listingUpdateQueues = {
    high: [],
    medium: [],
    low: []
};

/**
 * Add listing row to update queue, with priority based on how recently
 * it was accessed
 *
 * @param {String} schema
 * @param {Number} id
 * @param {String} atime
 */
function addToListingQueue(schema, id, atime) {
    var elapsed = getTimeElapsed(atime, new Date);
    var priority = 'low';
    if (elapsed < 60 * 1000) {
        // last accessed within 1 min
        priority = 'high';
    }

    // push item onto queue unless it's already there
    var item = { schema, id };
    var queue = listingUpdateQueues[priority];
    if (!_.find(queue, item)) {
        queue.push(item);
    }

    // remove it from the other queues
    _.forIn(listingUpdateQueues, (otherQueue) => {
        if (otherQueue !== queue) {
            var index = _.find(otherQueue, item);
            if (index !== -1) {
                otherQueue.splice(index, 1);
            }
        }
    });
    processNextInListingQueue();
}

var updatingListing = false;

/**
 * Process the next item in the listing queues
 */
function processNextInListingQueue() {
    if (updatingListing) {
        // already in the middle of something
        return;
    }
    var nextItem;
    _.each(listingUpdateQueues, (queue, priority) => {
        var nextItem = queue.shift();
        if (nextItem) {
            updatingListing = true;
            updateListing(nextItem.schema, nextItem.id).then((success) => {
                updatingListing = false;

                // delay the process of the next row depending on priority
                var delay = 0;
                switch (priority) {
                    case 'high': delay = 0; break;
                    case 'medium': delay = 100; break;
                    case 'low': delay = 500; break;
                }
                if (delay) {
                    setTimeout(processNextInListingQueue, delay);
                } else {
                    setImmediate(processNextInListingQueue);
                }
            }).catch((err) => {
                console.error(err)
                setImmediate(processNextInListingQueue);
            });
            return false;
        }
    });
}

/**
 * Update a statistics row, identified by id
 *
 * @param  {String} schema
 * @param  {Number} id
 *
 * @return {Promise<Listing>}
 */
function updateListing(schema, id) {
    var maxCandidateCount = 1000;
    return Database.open().then((db) => {
        // establish a lock on the row first, so multiple instances of this
        // script won't waste time performing the same work
        return Listing.lock(db, schema, id, '1 minute', 'gn, type, filters, details').then((listing) => {
            var oldStories = _.get(listing.details, 'stories', []);
            var newStories = _.get(listing.details, 'candidates', []);
            var earliest = _.reduce(oldStories, (earliest, story) => {
                if (!earliest || story.time < earliest) {
                    return story.time;
                }
            }, undefined);
            // look for new stories matching filters that aren't in the listing yet
            var filterCriteria = _.pick(listing.filters, _.keys(Story.criteria));
            var criteria = _.extend({}, filterCriteria, {
                published: true,
                ready: true,
                published_version_id: null,
                exclude: _.map(_.concat(oldStories, newStories), 'id'),
                bumped_after: earliest,
                order: 'time DESC',
                limit: maxCandidateCount,
            });
            var columns = _.flatten(_.map(storyRaters, 'columns'));
            columns = _.concat(columns, [ 'id', 'COALESCE(ptime, btime) AS time' ]);
            columns = _.uniq(columns);
            return Story.find(db, schema, criteria, columns.join(', ')).then((rows) => {
                var candidates;
                if (_.isEmpty(newStories)) {
                    candidates = _.reverse(rows);
                } else {
                    // insert into list, order by time
                    _.each(rows, (row) => {
                        var index = _.sortedIndexBy(newStories, row, 'time');
                        newStories.splice(index, 0, row);
                    });
                    candidates = newStories;
                }

                if (candidates.length > maxCandidateCount) {
                    // remove older ones
                    candidates.splice(0, candidates.length - maxCandidateCount);
                }

                // retrieve data needed asynchronously
                return prepareStoryRaterContexts(db, schema, candidates, listing).then((contexts) => {
                    // calculate the rating of each candidate story
                    _.each(candidates, (candidate) => {
                        candidate.rating = calculateStoryRating(contexts, candidate);
                    });

                    // save the new candidate list
                    var details = _.assign({}, listing.details, { candidates });
                    return Listing.unlock(db, schema, id, { details }, 'gn');
                });
            });
        }).finally(() => {
            return db.close();
        });
    });
}

/**
 * Call prepareContext() on each story raters
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Array<Story>} stories
 * @param  {Listing} listing
 *
 * @return {Promise<Object>}
 */
function prepareStoryRaterContexts(db, schema, stories, listing) {
    var contexts = {};
    return Promise.each(storyRaters, (rater) => {
        if (!rater.prepareContext) {
            console.log(rater);
        }
        return rater.prepareContext(db, schema, stories, listing).then((context) => {
            contexts[rater.name] = context;
        });
    }).return(contexts);
}

/**
 * Sum up the rating provider by each story rater
 *
 * @param  {Object} contexts
 * @param  {Story} story
 *
 * @return {Number}
 */
function calculateStoryRating(contexts, story) {
    var rating = _.reduce(storyRaters, (total, rater) => {
        var rating = rater.calculateRating(contexts[rater.name], story);
        return total + rating;
    }, 0);
    return rating;
}

/**
 * Called when monitored tables have changed
 *
 * @param  {Array<Object>} events
 */
function handleDatabaseChanges(events) {
    _.each(events, (event) => {
        _.each(storyRaters, (rater) => {
            if (_.includes(rater.monitoring, event.table)) {
                rater.handleEvent(event);
            }
        });
    });
}

/**
 * Fetch a list of project schemas
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<String>>}
 */
function getProjectSchemas(db) {
    return Project.find(db, 'global', { deleted: false }, 'name').then((rows) => {
        var names = _.map(_.sortBy(rows, 'name'), 'name');
        return names;
    });
}

/**
 * Return the difference between two timestamps in milliseconds
 *
 * @param  {String|Date} start
 * @param  {String|Date} end
 *
 * @return {Number}
 */
function getTimeElapsed(start, end) {
    if (!start) {
        return Infinity;
    }
    if (!end) {
        return 0;
    }
    var s = (typeof(start) === 'string') ? new Date(start) : start;
    var e = (typeof(end) === 'string') ? new Date(end) : end;
    return (e - s);
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}

Shutdown.on(stop);
