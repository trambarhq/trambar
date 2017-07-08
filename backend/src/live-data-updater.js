var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');

// accessors
var Statistics = require('accessors/statistics');
var Listing = require('accessors/listing');
var Project = require('accessors/project');
var Story = require('accessors/story');

// analysers
var DailyActivities = require('analysers/daily-activities');
var ProjectDateRange = require('analysers/project-date-range');
var StoryPopularity = require('analysers/story-popularity');

var analysers = [
    DailyActivities,
    ProjectDateRange,
    StoryPopularity,
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
            return db.listen(tables, 'clean', handleCleanRequests);
        }).then(() => {
            return db.listen([ 'statistics' ], 'change', handleStatisticsChanges, 0)
        });
    });
}

function stop() {
    if (database) {
        database.close();
    }
    return Promise.resolve();
}

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
            return addToStatisticsQueue(schema, row.id, row.atime);
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
function fetchDirtyListings(db) {
    return getProjectSchemas(db).each((schema) => {
        var criteria = { dirty: true };
        return Listing.find(db, schema, criteria, 'id, atime').each((row) => {
            return addToListingQueue(schema, row.id, row.atime);
        });
    });
}

var statisticsUpdateQueues = {
    high: [],
    midium: [],
    low: []
};

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
    midium: [],
    low: []
};

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

function updateListing(schema, id) {
    return Database.open().then((db) => {
        // establish a lock on the row first, so multiple instances of this
        // script won't waste time performing the same work
        return Listing.lock(db, schema, id, '1 minute', 'gn, type, filters, details').then((row) => {
            var criteria = _.extend({}, row.filters, {
                ready: true,
                limit: 5000,
            });
            var oldStories = _.get(row.details, 'stories', []);
            var newStories = _.get(row.details, 'candidates', []);
            var included = {};
            var latest = '';
            _.each(_.concat(oldStories, newStories), (story) => {
                included[story.id] = true;
                if (story.ptime > latest) {
                    latest = story.ptime;
                }
            });
            if (latest) {
                criteria.published_version_id = null;
                criteria.newer_than = latest;
            }
            return Story.find(db, schema, criteria, 'id, type, ptime').then((rows) => {
                // add additional candidate stories to list
                newStories = _.slice(newStories);
                _.each(rows, (row) => {
                    if (!included[row.id]) {
                        newStories.push(row);
                    }
                })
            }).then(() => {
                // fetch the popularity stats, from cache if possible
                var async = false;
                var popularity = {};
                _.each(newStories, (story) => {
                    var details = getStoryPopularity(schema, story.id);
                    if (!details) {
                        details = fetchStoryPopularity(db, schema, story.id);
                        async = true;
                    }
                    popularity[story.id] = details;
                });
                return (async) ? Promise.props(popularity) : popularity;
            }).then((popularity) => {
                // calculate the rating of each story
                _.each(newStories, (story) => {
                    var details = popularity[story.id] || {};
                    story.rating = calculateStoryRating(story, details);
                });
            }).then(() => {
                var details = _.clone(row.details);
                details.candidates = newStories;
                return Listing.unlock(db, schema, id, { details }, 'gn');
            });
        }).finally(() => {
            return db.close();
        });
    });
}

function calculateStoryRating(story, popularity) {
    return 1;
}

var popularityCache = {};

function getStoryPopularity(schema, storyId) {
    var keys = [ schema, storyId ];
    var cacheEntry = _.get(popularityCache, keys);
    if (cacheEntry) {
        cacheEntry.atime = new Date;
        return cacheEntry.details;
    }
}

function fetchStoryPopularity(db, schema, storyId) {
    var criteria = {
        type: 'story-popularity',
        filters: {
            story_id: storyId
        }
    };
    return Statistics.findOne(db, schema, criteria, 'details').then((row) => {
        if (row) {
            var keys = [ schema, storyId ];
            var cacheEntry = {
                atime: new Date,
                details: row.details
            };
            _.set(popularityCache, keys, cacheEntry);
        }
    });
}

function handleStatisticsChanges(events) {
    _.each(events, (event) => {
        if (event.op === 'UPDATE') {
            if (event.diff.details) {
                // update cache entry if it exists
                var details = event.diff.details[1];
                var keys = [ event.schema, event.id ];
                var cacheEntry = _.get(popularityCache, keys);
                if (cacheEntry) {
                    cacheEntry.details = details;
                }
            }
        } else if (event.op === 'INSERT') {
            if (event.diff.type && event.diff.details) {
                var type = event.diff.type[1];
                var details = event.diff.details[1];
                if (type === 'story-popularity') {
                    // create a new entry on insert even though details would
                    // likely be empty, because the stats type is sent in an
                    // INSERT notification but not in an UPDATE notification
                    var atime = new Date;
                    var keys = [ event.schema, event.id ];
                    var cacheEntry = { details, atime };
                    _.set(popularityCache, keys, cacheEntry);
                }
            }
        }
    });
}

function getProjectSchemas(db) {
    return Project.find(db, 'global', { deleted: false }, 'name').then((rows) => {
        var names = _.map(_.sortBy(rows, 'name'), 'name');
        return names;
    });
}

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
