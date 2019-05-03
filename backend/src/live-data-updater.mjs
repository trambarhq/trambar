import _ from 'lodash';
import Moment from 'moment';
import Bluebird from 'bluebird';
import FS from 'fs';
import Database from 'database';
import * as Shutdown from 'shutdown';
import AsyncQueue from 'utils/async-queue';

// accessors
import Statistics from 'accessors/statistics';
import Listing from 'accessors/listing';
import Project from 'accessors/project';
import Story from 'accessors/story';

// load available analysers
const Analysers = _.filter(_.map(FS.readdirSync(`${__dirname}/lib/analysers`), (filename) => {
    if (/\.js$/.test(filename)) {
        let module = require(`analysers/${filename}`).default;
        return module;
    }
}));
// load available story raters
const StoryRaters = _.filter(_.map(FS.readdirSync(`${__dirname}/lib/story-raters`), (filename) => {
    if (/\.js$/.test(filename)) {
        let module = require(`story-raters/${filename}`).default;
        // certain ratings cannot be applied until the listing is being retrieved
        // (e.g. by retrieval time)
        if (module.calculation !== 'deferred') {
            return module;
        }
    }
}));

let database;

async function start() {
    let db = database = await Database.open(true);
    await db.need('global');
    await queueDirtyStatistics(db);
    await queueDirtyListings(db);

    let liveDataTables = [ 'listing', 'statistics' ];
    await db.listen(liveDataTables, 'clean', handleCleanRequests, 0);

    // capture event for tables that the story raters are monitoring
    // (for the purpose of cache invalidation)
    let raterTables = _.uniq(_.flatten(_.map(StoryRaters, 'monitoring')));
    await db.listen(raterTables, 'change', handleRatingDependencyChanges, 0);

    // listen for changes to stories so we can invalidate cache
    await db.listen([ 'story' ], 'change', handleStoryChanges, 0);

    processStatisticsQueue();
    processListingQueue();
}

async function stop() {
    processStatisticsQueue();
    haltListingQueue();

    if (database) {
        await Statistics.relinquish(database);
        await Listing.relinquish(database);
        database.close();
        database = null;
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
    let now = new Date;
    for (let event of events) {
        switch (event.table) {
            case 'statistics':
                addToStatisticsQueue(event.schema, event.id, event.atime);
                break;
            case 'listing':
                addToListingQueue(event.schema, event.id, event.atime);
                break;
        }
    }
}

/**
 * Called when monitored tables have changed
 *
 * @param  {Array<Object>} events
 */
function handleRatingDependencyChanges(events) {
    for (let event of events) {
        for (let rater of StoryRaters) {
            if (_.includes(rater.monitoring, event.table)) {
                rater.handleEvent(event);
            }
        }
    }
}

/**
 * Called when story table has changed
 *
 * @param  {Array<Object>} events
 */
function handleStoryChanges(events) {
    // invalidate story cache
    Story.clearCache((search) => {
        for (let event of events) {
            if (event.table === 'story' && search.schema === event.schema) {
                // don't clear cache unless change is made to a published story
                if (event.current.published === true || event.diff.published) {
                    return false;
                }
            }
        }
        return true;
    });
}

/**
 * Fetch dirty statistics records from database and place them in update queues
 *
 * @param  {Database} db
 *
 * @return {Promise}
 */
async function queueDirtyStatistics(db) {
    let schemas = await getProjectSchemas(db);
    for (let schema of schemas) {
        try {
            let criteria = { dirty: true, order: 'sample_count' };
            let rows = await Statistics.find(db, schema, criteria, 'id, atime');
            for (let row of rows) {
                addToStatisticsQueue(schema, row.id, row.atime);
            }
        } catch (err) {
            console.log(`Unable to scan for out-of-date statistics: ${err.message}`);
        }
    }
}

/**
 * Fetch dirty listings from database and place them in update queues
 *
 * @param  {Database} db
 *
 * @return {Promise}
 */
async function queueDirtyListings(db) {
    let schemas = await getProjectSchemas(db);
    for (let schema of schemas) {
        try {
            let criteria = { dirty: true };
            let rows = await Listing.find(db, schema, criteria, 'id, atime');
            for (let row of rows) {
                addToListingQueue(schema, row.id, row.atime);
            }
        } catch (err) {
            console.log(`Unable scan for out-of-date story listings: ${err.message}`);
        }
    }
}

const HIGH = 10;
const MEDIUM = 5;
const LOW = 1;

let statisticsUpdateQueue = new AsyncQueue('priority', 'desc');

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
    let elapsed = getTimeElapsed(atime, new Date);
    let priority = LOW;
    if (elapsed < 10 * 1000) {
        // last accessed within 10 sec
        priority = HIGH;
    } else if (elapsed < 15 * 60 * 1000) {
        // last accessed within 15 min
        priority = MEDIUM;
    }

    statisticsUpdateQueue.remove({ schema, id });
    statisticsUpdateQueue.add({ schema, id, priority });
}

async function processStatisticsQueue() {
    statisticsUpdateQueue.start();
    for (;;) {
        let item = await statisticsUpdateQueue.pull();
        if (!item) {
            break;
        }
        try {
            await updateStatistics(item.schema, item.id);

            let delay;
            switch (item.priority) {
                case HIGH: delay = 0; break;
                case MEDIUM: delay = 100; break;
                case LOW: delay = 500; break;
            }
            if (delay) {
                await Bluebird.delay(delay);
            }
        } catch (err) {
            console.error(err);
        }
    }
}

function haltStatisticsQueue() {
    statisticsUpdateQueue.stop();
}

/**
 * Update a statistics row, identified by id
 *
 * @param  {String} schema
 * @param  {Number} id
 *
 * @return {Promise<Statistics|null>}
 */
async function updateStatistics(schema, id) {
    console.log(`Updating statistics in ${schema}: ${id}`);
    let db = await Database.open();
    // establish a lock on the row first, so multiple instances of this
    // script won't waste time performing the same work
    let row = await Statistics.lock(db, schema, id, '1 minute', 'gn, type, filters');
    if (!row) {
        return;
    }
    try {
        // regenerate the row
        let analyser = _.find(Analysers, { type: row.type });
        if (!analyser) {
            throw new Error('Unknown statistics type: ' + row.type);
        }
        let props = await analyser.generate(db, schema, row.filters);
        // save the new data and release the lock
        await Statistics.unlock(db, schema, id, props, 'gn');
    } catch (err) {
        await Statistics.unlock(db, schema, id);
        throw err;
    }
}

let listingUpdateQueue = new AsyncQueue('priority', 'desc');
/**
 * Add listing row to update queue, with priority based on how recently
 * it was accessed
 *
 * @param {String} schema
 * @param {Number} id
 * @param {String} atime
 */
function addToListingQueue(schema, id, atime) {
    let elapsed = getTimeElapsed(atime, new Date);
    let priority = 'low';
    if (elapsed < 60 * 1000) {
        // last accessed within 1 min
        priority = 'high';
    }
    listingUpdateQueue.remove({ schema, id });
    listingUpdateQueue.add({ schema, id, priority });
}

async function processListingQueue() {
    listingUpdateQueue.start();
    for (;;) {
        let item = await listingUpdateQueue.pull();
        if (!item) {
            break;
        }
        try {
            await updateListing(item.schema, item.id);

            let delay;
            switch (item.priority) {
                case HIGH: delay = 0; break;
                case MEDIUM: delay = 100; break;
                case LOW: delay = 500; break;
            }
            if (delay) {
                await Bluebird.delay(delay);
            }
        } catch (err) {
            console.error(err);
        }
    }
}

function haltListingQueue() {
    listingUpdateQueue.stop();
}

/**
 * Update a listing, identified by id
 *
 * @param  {String} schema
 * @param  {Number} id
 *
 * @return {Promise}
 */
async function updateListing(schema, id) {
    console.log(`Updating listing in ${schema}: ${id}`);
    let db = await Database.open();
    // establish a lock on the row first, so multiple instances of this
    // script won't waste time performing the same work
    let listing = await Listing.lock(db, schema, id, '1 minute', 'gn, type, filters, details');
    if (!listing) {
        return;
    }
    try {
        let limit = _.get(listing.filters, 'limit', 100);
        let latestStoryTime = _.get(listing.details, 'latest');
        let earliestStoryTime = _.get(listing.details, 'earliest');
        let retrievedStories = _.get(listing.details, 'stories', []);
        let maxCandidateCount = 1000;

        let filterCriteria = _.pick(listing.filters, _.keys(Story.criteria));
        let criteria = _.extend({}, filterCriteria, {
            published: true,
            ready: true,
            deleted: false,
            published_version_id: null,
            order: 'btime DESC',
            limit: maxCandidateCount,
        });
        let columns = _.flatten(_.map(StoryRaters, 'columns'));
        columns = _.concat(columns, [ 'id', 'COALESCE(ptime, btime) AS btime' ]);
        columns = _.uniq(columns);
        let stories = await Story.findCached(db, schema, criteria, columns.join(', '));
        // take out stories retrieved earlier that are no longer
        // available for one reason or another (deleted, made private, etc)
        //
        // in theory, a story might be absent simply because there're so
        // many newer ones that it's now excluded by the row limit; in
        // that case the story is bound to get pushed out anyway so
        // removing it (for the wrong reason) isn't an issue
        let storyHash = _.keyBy(stories, 'id');
        let retainingStories = _.filter(retrievedStories, (story) => {
            return !!storyHash[story.id];
        });

        // get unretrieved stories that are newer than the last story considered
        let retrievedStoriesHash = _.keyBy(retrievedStories, 'id');
        let newStories = _.filter(stories, (story) => {
            if (!retrievedStoriesHash[story.id]) {
                if (!latestStoryTime || story.btime > latestStoryTime) {
                    return true;
                }
            }
        });

        let oldRows = [];
        let gap = Math.max(0, limit - _.size(retainingStories) - _.size(newStories));
        if (gap > 0) {
            // need to backfill the list--look for stories with btime
            // earlier than stories already retrieved
            //
            // first, find stories that were rejected earlier
            let newStoriesHash = _.keyBy(newStories, 'id');
            let ignoredStories = _.filter(stories, (story) => {
                if (!retrievedStoriesHash[story.id] && !newStoriesHash[story.id]) {
                    if (earliestStoryTime && story.btime <= earliestStoryTime) {
                        return true;
                    }
                }
            });

            // don't go too far back--just one day
            let dayBefore = Moment(earliestStoryTime).subtract(1, 'day').toISOString();
            oldRows = _.filter(ignoredStories, (story) => {
                return (story.btime >= dayBefore);
            });

            if (_.size(oldRows) < gap) {
                // not enough--just take whatever
                oldRows = _.slice(ignoredStories, 0, gap);
            }
        }
        let selectedRows = _.concat(newStories, oldRows);
        // retrieve data needed to rate the candidates
        let contexts = await prepareStoryRaterContexts(db, schema, selectedRows, listing);
        let candidates = _.map(newStories, (story) => {
            return {
                id: story.id,
                btime: story.btime,
                rating: calculateStoryRating(contexts, story),
            };
        });
        let backfillCandidates = _.map(oldRows, (story) => {
            return {
                id: story.id,
                btime: story.btime,
                rating: calculateStoryRating(contexts, story),
            };
        });
        if (_.isEmpty(backfillCandidates)) {
            backfillCandidates = undefined;
        }

        // save the new candidate list
        let details = _.assign({}, listing.details, {
            stories: retainingStories,
            candidates: candidates,
            backfill_candidates: backfillCandidates
        });
        let finalized;
        if (!_.isEmpty(candidates) || !_.isEmpty(backfillCandidates)) {
            // there're story candidates--listing needs to be
            // finalized when the user retrieves it
            finalized = false;
        } else if (_.isEmpty(listing.details)) {
            // initializing a listing--finalized needs to be set
            // to false as notification won't be send otherwise
            finalized = false;
        } else {
            finalized = true;
        }
        await Listing.unlock(db, schema, id, { details, finalized }, 'gn');
    } catch (err) {
        await Listing.unlock(db, schema, id);
        throw err;
    }
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
async function prepareStoryRaterContexts(db, schema, stories, listing) {
    let contexts = {};
    for (let rater of StoryRaters) {
        let context = await rater.prepareContext(db, schema, stories, listing);
        contexts[rater.type] = context;
    }
    return contexts;
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
    let total = 0;
    for (let rater of StoryRaters) {
        let rating = rater.calculateRating(contexts[rater.type], story);
        total += rating;
    }
    return total;
}

/**
 * Fetch a list of project schemas
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<String>>}
 */
async function getProjectSchemas(db) {
    let rows = await Project.find(db, 'global', { deleted: false }, 'name');
    let names = _.map(_.sortBy(rows, 'name'), 'name');
    return names;
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
    let s = (typeof(start) === 'string') ? new Date(start) : start;
    let e = (typeof(end) === 'string') ? new Date(end) : end;
    return (e - s);
}

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
