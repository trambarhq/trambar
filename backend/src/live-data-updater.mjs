import _ from 'lodash';
import Bluebird from 'bluebird';
import FS from 'fs';
import Moment from 'moment';
import Database from './lib/database.mjs';
import * as TaskLog from './lib/task-log.mjs';
import * as Shutdown from './lib/shutdown.mjs';
import AsyncQueue from './lib/common/utils/async-queue.mjs';

// accessors
import Statistics from './lib/accessors/statistics.mjs';
import Listing from './lib/accessors/listing.mjs';
import Project from './lib/accessors/project.mjs';
import Story from './lib/accessors/story.mjs';
import User from './lib/accessors/user.mjs';

//  analysers
import DailyActivities from './lib/analysers/daily-activities.mjs';
import DailyNotifications from './lib/analysers/daily-notifications.mjs';
import NotificationDateRange from './lib/analysers/notification-date-range.mjs';
import StoryDateRange from './lib/analysers/story-date-range.mjs';
import StoryPopularity from './lib/analysers/story-popularity.mjs';

// story raters
import ByDiversity from './lib/story-raters/by-diversity.mjs';
import ByPopularity from './lib/story-raters/by-popularity.mjs';
import ByRole from './lib/story-raters/by-role.mjs';
import ByType from './lib/story-raters/by-type.mjs';

const Analysers = [
  DailyActivities,
  DailyNotifications,
  NotificationDateRange,
  StoryDateRange,
  StoryPopularity,
];

const StoryRaters = [
  ByDiversity,
  ByPopularity,
  ByRole,
  ByType,
];

let database;

async function start() {
  const db = database = await Database.open(true);
  await db.need('global');
  await queueDirtyStatistics(db);
  await queueDirtyListings(db);

  const liveDataTables = [ 'listing', 'statistics' ];
  await db.listen(liveDataTables, 'clean', handleCleanRequests, 0);

  // capture event for tables that the story raters are monitoring
  // (for the purpose of cache invalidation)
  const raterTables = _.uniq(_.flatten(_.map(StoryRaters, 'monitoring')));
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
  const schemas = await getProjectSchemas(db);
  for (let schema of schemas) {
    const taskLog = TaskLog.start('statistics-queue', { project: schema });
    try {
      const criteria = { dirty: true, order: 'sample_count' };
      const rows = await Statistics.find(db, schema, criteria, 'id, atime');
      for (let row of rows) {
        addToStatisticsQueue(schema, row.id, row.atime);
      }
      taskLog.set('count', _.size(rows));
      await taskLog.finish();
    } catch (err) {
      await taskLog.abort(err);
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
  const schemas = await getProjectSchemas(db);
  for (let schema of schemas) {
    const taskLog = TaskLog.start('listing-queue', { project: schema });
    try {
      const criteria = { dirty: true };
      const rows = await Listing.find(db, schema, criteria, 'id, atime');
      for (let row of rows) {
        addToListingQueue(schema, row.id, row.atime);
      }
      taskLog.set('count', _.size(rows));
      await taskLog.finish();
    } catch (err) {
      await taskLog.abort(err);
    }
  }
}

const HIGH = 10;
const MEDIUM = 5;
const LOW = 1;

const statisticsUpdateQueue = new AsyncQueue('priority', 'desc');

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
  const elapsed = getTimeElapsed(atime, new Date);
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
    const item = await statisticsUpdateQueue.pull();
    if (!item) {
      break;
    }
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
  const taskLog = TaskLog.start('statistics-update', {
    project: schema,
    statistics_id: id,
  });
  const db = await Database.open();
  // establish a lock on the row first, so multiple instances of this
  // script won't waste time performing the same work
  const row = await Statistics.lock(db, schema, id, '1 minute', 'gn, type, filters');
  if (!row) {
    return;
  }
  try {
    // regenerate the row
    const analyser = _.find(Analysers, { type: row.type });
    if (!analyser) {
      throw new Error('Unknown statistics type: ' + row.type);
    }
    const props = await analyser.generate(db, schema, row.filters);
    // save the new data and release the lock
    await Statistics.unlock(db, schema, id, props, 'gn');
    taskLog.set('type', row.type);
    if (!_.isEmpty(row.filters)) {
      taskLog.set('filters', _.keys(row.filters));
    }
    await taskLog.finish();
  } catch (err) {
    await Statistics.unlock(db, schema, id);
    await taskLog.abort(err);
  }
}

const listingUpdateQueue = new AsyncQueue('priority', 'desc');
/**
 * Add listing row to update queue, with priority based on how recently
 * it was accessed
 *
 * @param {String} schema
 * @param {Number} id
 * @param {String} atime
 */
function addToListingQueue(schema, id, atime) {
  const elapsed = getTimeElapsed(atime, new Date);
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
    const item = await listingUpdateQueue.pull();
    if (!item) {
      break;
    }
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
  const taskLog = TaskLog.start('list-update', {
    project: schema,
    listing_id: id,
  });
  const db = await Database.open();
  // establish a lock on the row first, so multiple instances of this
  // script won't waste time performing the same work
  const listing = await Listing.lock(db, schema, id, '1 minute', 'gn, type, filters, details, target_user_id');
  if (!listing) {
    return;
  }
  try {
    const limit = _.get(listing.filters, 'limit', 100);
    const latestStoryTime = _.get(listing.details, 'latest');
    const earliestStoryTime = _.get(listing.details, 'earliest');
    const retrievedStories = _.get(listing.details, 'stories', []);
    const maxCandidateCount = 1000;

    const filterCriteria = _.pick(listing.filters, _.keys(Story.criteria));
    const criteria = {
      ...filterCriteria,
      published: true,
      ready: true,
      deleted: false,
      published_version_id: null,
      order: 'btime DESC',
      limit: maxCandidateCount,
    };
    let columns = _.flatten(_.map(StoryRaters, 'columns'));
    columns = _.concat(columns, [ 'id', 'COALESCE(ptime, btime) AS btime' ]);
    columns = _.uniq(columns);
    const stories = await Story.findCached(db, schema, criteria, columns.join(', '));
    // take out stories retrieved earlier that are no longer
    // available for one reason or another (deleted, made private, etc)
    //
    // in theory, a story might be absent simply because there're so
    // many newer ones that it's now excluded by the row limit; in
    // that case the story is bound to get pushed out anyway so
    // removing it (for the wrong reason) isn't an issue
    const storyHash = _.keyBy(stories, 'id');
    const retainingStories = _.filter(retrievedStories, (story) => {
      return !!storyHash[story.id];
    });

    // get unretrieved stories that are newer than the last story considered
    const retrievedStoriesHash = _.keyBy(retrievedStories, 'id');
    const newStories = _.filter(stories, (story) => {
      if (!retrievedStoriesHash[story.id]) {
        if (!latestStoryTime || story.btime > latestStoryTime) {
          return true;
        }
      }
    });

    let oldRows = [];
    const gap = Math.max(0, limit - _.size(retainingStories) - _.size(newStories));
    if (gap > 0) {
      // need to backfill the list--look for stories with btime
      // earlier than stories already retrieved
      //
      // first, find stories that were rejected earlier
      const newStoriesHash = _.keyBy(newStories, 'id');
      const ignoredStories = _.filter(stories, (story) => {
        if (!retrievedStoriesHash[story.id] && !newStoriesHash[story.id]) {
          if (earliestStoryTime && story.btime <= earliestStoryTime) {
            return true;
          }
        }
      });

      // don't go too far back--just one day
      const dayBefore = Moment(earliestStoryTime).subtract(1, 'day').toISOString();
      oldRows = _.filter(ignoredStories, (story) => {
        return (story.btime >= dayBefore);
      });

      if (_.size(oldRows) < gap) {
        // not enough--just take whatever
        oldRows = _.slice(ignoredStories, 0, gap);
      }
    }
    const selectedRows = _.concat(newStories, oldRows);
    // retrieve data needed to rate the candidates
    const contexts = await prepareStoryRaterContexts(db, schema, selectedRows, listing);
    const candidates = _.map(newStories, (story) => {
      return {
        id: story.id,
        btime: story.btime,
        rating: calculateStoryRating(contexts, story),
      };
    });
    const backfillCandidates = _.isEmpty(oldRows) ? undefined : _.map(oldRows, (story) => {
      return {
        id: story.id,
        btime: story.btime,
        rating: calculateStoryRating(contexts, story),
      };
    });

    // save the new candidate list
    const details = _.assign({}, listing.details, {
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
    const username = await getUserName(db, listing.target_user_id);
    taskLog.set('type', listing.type);
    taskLog.set('user', username);
    taskLog.set('candidates', _.map(newStories, 'id'));
    if (backfillCandidates) {
      taskLog.set('backfill', _.map(backfillCandidates, 'id'));
    }
    if (!_.isEmpty(listing.filters)) {
      taskLog.set('filters', _.keys(listing.filters));
    }
    await taskLog.finish();
  } catch (err) {
    await Listing.unlock(db, schema, id);
    await taskLog.abort(err);
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
  const contexts = {};
  for (let rater of StoryRaters) {
    const context = await rater.prepareContext(db, schema, stories, listing);
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
    const rating = rater.calculateRating(contexts[rater.type], story);
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
  const rows = await Project.find(db, 'global', { deleted: false }, 'name');
  const names = _.map(_.sortBy(rows, 'name'), 'name');
  return names;
}

/**
 * Return username for logging purpose
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<String>}
 */
async function getUserName(db, id) {
  const users = await User.findCached(db, 'global', { deleted: false }, 'id, username');
  const user = _.find(users, { id });
  return _.get(user, 'username');
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
  const s = (typeof(start) === 'string') ? new Date(start) : start;
  const e = (typeof(end) === 'string') ? new Date(end) : end;
  return (e - s);
}

if ('file://' + process.argv[1] === import.meta.url) {
  start();
  Shutdown.addListener(stop);
}

export {
  start,
  stop,
};
