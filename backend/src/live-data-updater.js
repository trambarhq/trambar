var _ = require('lodash');
var Promise = require('bluebird');
var FS = require('fs');
var Database = require('database');
var Shutdown = require('shutdown');

// accessors
var Statistics = require('accessors/statistics');
var Listing = require('accessors/listing');
var Project = require('accessors/project');
var Story = require('accessors/story');

// load available analysers
var Analysers = _.filter(_.map(FS.readdirSync(`${__dirname}/lib/analysers`), (filename) => {
    if (/\.js$/.test(filename)) {
        var module = require(`analysers/${filename}`);
        return module;
    }
}));
// load available story raters
var StoryRaters = _.filter(_.map(FS.readdirSync(`${__dirname}/lib/story-raters`), (filename) => {
    if (/\.js$/.test(filename)) {
        var module = require(`story-raters/${filename}`);
        // retrieval time rating cannot be applied until the listing is being retrieved
        if (module.type !== 'by-retrieval-time') {
            return module;
        }
    }
}));

module.exports = {
    start,
    stop,
};

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
            var tables = _.filter(_.uniq(_.flatten(_.map(StoryRaters, 'monitoring'))));
            return db.listen(tables, 'change', handleDatabaseChanges, 0);
        });
    });
}

function stop() {
    if (database) {
        return Statistics.relinquish(database).then(() => {
            return Listing.relinquish(database).then(() => {
                database.close();
                database = null;
            });
        });
    } else {
        return Promise.resolve();
    }
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
 * Called when monitored tables have changed
 *
 * @param  {Array<Object>} events
 */
function handleDatabaseChanges(events) {
    _.each(events, (event) => {
        _.each(StoryRaters, (rater) => {
            if (_.includes(rater.monitoring, event.table)) {
                rater.handleEvent(event);
            }
        });
    });
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
    if (!_.some(queue, item)) {
        queue.push(item);
    }

    // remove it from the other queues
    _.forIn(statisticsUpdateQueues, (otherQueue, priority) => {
        if (otherQueue !== queue) {
            var index = _.findIndex(otherQueue, item);
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
    for (var priority in statisticsUpdateQueues) {
        var queue = statisticsUpdateQueues[priority];
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
            return;
        }
    }
}

/**
 * Update a statistics row, identified by id
 *
 * @param  {String} schema
 * @param  {Number} id
 *
 * @return {Promise<Statistics|null>}
 */
function updateStatistics(schema, id) {
    console.log(`Updating statistics in ${schema}: ${id}`);
    return Database.open().then((db) => {
        // establish a lock on the row first, so multiple instances of this
        // script won't waste time performing the same work
        return Statistics.lock(db, schema, id, '1 minute', 'gn, type, filters').then((row) => {
            if (!row) {
                return null;
            }
            // regenerate the row
            var analyser = _.find(Analysers, { type: row.type });
            if (!analyser) {
                throw new Error('Unknown statistics type: ' + row.type);
            }
            return analyser.generate(db, schema, row.filters).then((props) => {
                // save the new data and release the lock
                return Statistics.unlock(db, schema, id, props, 'gn');
            }).catch((err) => {
                return Statistics.unlock(db, schema, id).throw(err);
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
    if (!_.some(queue, item)) {
        queue.push(item);
    }

    // remove it from the other queues
    _.forIn(listingUpdateQueues, (otherQueue) => {
        if (otherQueue !== queue) {
            var index = _.findIndex(otherQueue, item);
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
    for (var priority in listingUpdateQueues) {
        var queue = listingUpdateQueues[priority];
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
            return;
        }
    }
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
    console.log(`Updating listing in ${schema}: ${id}`);
    var maxCandidateCount = 1000;
    return Database.open().then((db) => {
        // establish a lock on the row first, so multiple instances of this
        // script won't waste time performing the same work
        return Listing.lock(db, schema, id, '1 minute', 'gn, type, filters, details').then((listing) => {
            if (!listing) {
                return null;
            }
            var oldStories = _.get(listing.details, 'stories', []);
            var newStories = _.get(listing.details, 'candidates', []);
            var earliest = _.reduce(oldStories, (earliest, story) => {
                if (!earliest || story.btime < earliest) {
                    earliest = story.btime;
                }
                return earliest;
            }, undefined);
            // look for new stories matching filters that aren't in the listing yet
            var filterCriteria = _.pick(listing.filters, _.keys(Story.criteria));
            var criteria = _.extend({}, filterCriteria, {
                published: true,
                ready: true,
                published_version_id: null,
                exclude: _.map(_.concat(oldStories, newStories), 'id'),
                bumped_after: earliest,
                order: 'btime DESC',
                limit: maxCandidateCount,
            });
            var columns = _.flatten(_.map(StoryRaters, 'columns'));
            columns = _.concat(columns, [ 'id', 'COALESCE(ptime, btime) AS btime' ]);
            columns = _.uniq(columns);
            return Story.find(db, schema, criteria, columns.join(', ')).then((rows) => {
                // insert into list, order by btime
                var candidates = _.slice(newStories);
                _.each(rows, (row) => {
                    var index = _.sortedIndexBy(candidates, row, 'btime');
                    candidates.splice(index, 0, row);
                });
                if (candidates.length > maxCandidateCount) {
                    // remove older ones
                    candidates.splice(0, candidates.length - maxCandidateCount);
                }

                // asynchronously retrieve data needed to rate the candidates
                return prepareStoryRaterContexts(db, schema, candidates, listing).then((contexts) => {
                    // calculate the rating of each candidate story
                    _.each(candidates, (candidate) => {
                        candidate.rating = calculateStoryRating(contexts, candidate);
                    });

                    // save the new candidate list
                    var details = _.assign({}, listing.details, { candidates });
                    var finalized = _.isEmpty(candidates);
                    return Listing.unlock(db, schema, id, { details, finalized }, 'gn');
                });
            }).catch((err) => {
                return Listing.unlock(db, schema, id).throw(err);
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
    return Promise.each(StoryRaters, (rater) => {
        return rater.prepareContext(db, schema, stories, listing).then((context) => {
            contexts[rater.type] = context;
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
    var rating = _.reduce(StoryRaters, (total, rater) => {
        var rating = rater.calculateRating(contexts[rater.type], story);
        return total + rating;
    }, 0);
    return rating;
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

if (process.argv[1] === __filename) {
    start();
}

Shutdown.on(stop);
