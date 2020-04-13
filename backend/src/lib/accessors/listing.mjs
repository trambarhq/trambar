import _ from 'lodash';
import Crypto from 'crypto'
import { Database } from '../database.mjs';
import { HTTPError } from '../errors.mjs';
import { LiveData } from './live-data.mjs';

import { ByRetrievalTime } from '../story-raters/by-retrieval-time.mjs';

export class Listing extends LiveData {
  static schema = 'project';
  static table = 'listing';
  static columns = {
    ...LiveData.columns,
    finalized: Boolean,
    type: String,
    filters: Object,
    filters_hash: String,
    target_user_id: Number,
  };
  static criteria = {
    ...LiveData.criteria,
    finalized: Boolean,
    type: String,
    filters: Object,
    filters_hash: String,
    target_user_id: Number,
    match_any: Array(Object),
    has_candidates: Array(Number),
  };
  static eventColumns = {
    ...LiveData.eventColumns,
    finalized: Boolean,
    type: String,
    target_user_id: Number,
  };

  /**
   * Create table in schema
   *
   * @param  {Database} db
   * @param  {string} schema
   */
  static async create(db, schema) {
    const table = this.getTableName(schema);
    const sql = `
      CREATE TABLE ${table} (
        id serial,
        gn int NOT NULL DEFAULT 1,
        deleted boolean NOT NULL DEFAULT false,
        ctime timestamp NOT NULL DEFAULT NOW(),
        mtime timestamp NOT NULL DEFAULT NOW(),
        details jsonb NOT NULL DEFAULT '{}',
        atime timestamp,
        ltime timestamp,
        dirty boolean NOT NULL DEFAULT false,
        finalized boolean NOT NULL DEFAULT true,
        type varchar(32) NOT NULL,
        target_user_id int NOT NULL,
        filters jsonb NOT NULL,
        filters_hash varchar(32) NOT NULL,
        PRIMARY KEY (id)
      );
      CREATE INDEX ON ${table} (target_user_id, filters_hash, type) WHERE deleted = false;
      CREATE UNIQUE INDEX ON ${table} (id) WHERE dirty = true;
    `;
    await db.execute(sql);
  }

  /**
   * Attach triggers to the table.
   *
   * @param  {Database} db
   * @param  {string} schema
   *
   * @return {boolean}
   */
  static async watch(db, schema) {
    await this.createChangeTrigger(db, schema);
    await this.createNotificationTriggers(db, schema);
  }

  /**
   * Add conditions to SQL query based on criteria object
   *
   * @param  {Object} criteria
   * @param  {Object} query
   */
  static apply(criteria, query) {
    const { filters, match_any, has_candidates, ...basic } = criteria;
    super.apply(basic, query);

    const params = query.parameters;
    const conds = query.conditions;
    if (match_any) {
      const objects = `$${params.push(match_any)}`;
      conds.push(`"matchAny"(filters, ${objects})`);
    }
    if (has_candidates) {
      const storyIds = `$${params.push(has_candidates)}`;
      conds.push(`"hasCandidates"(details, ${storyIds})`);
    }
  }

  static async find(db, schema, criteria, columns) {
    // autovivify rows when type and filters are specified
    const type = criteria.type;
    const userId = criteria.target_user_id;
    let filters = criteria.filters;
    if (type && filters && userId) {
      // calculate hash of filters for quicker look-up
      if (!(filters instanceof Array)) {
        filters = [ filters ];
      }
      const hashes = _.map(filters, hash);
      // key columns
      const keys = {
        type: type,
        filters_hash: hashes,
        target_user_id: userId,
      };
      // properties of rows that are expected
      const expectedRows = _.map(hashes, (hash, index) => {
        return {
          type: type,
          filters_hash: hash,
          filters: filters[index],
          target_user_id: userId,
        };
      });
      return this.vivify(db, schema, keys, expectedRows, columns);
    } else {
      return super.find(db, schema, criteria, columns);
    }
  }

  /**
   * Export database row to client-side code, omitting sensitive or
   * unnecessary information
   *
   * @param  {Database} db
   * @param  {string} schema
   * @param  {Object[]} rows
   * @param  {Object} credentials
   * @param  {Object} options
   *
   * @return {Object}
   */
  static async export(db, schema, rows, credentials, options) {
    for (let row of rows) {
      if (!row.finalized) {
        if (credentials.user.id === row.target_user_id) {
          // add new stories from list of candidates
          this.finalize(db, schema, row);
        }
      }
    }
    const objects = await super.export(db, schema, rows, credentials, options);
    for (let [ index, object ] of objects.entries()) {
      const row = rows[index];
      object.type = row.type;
      object.target_user_id = row.target_user_id;
      object.filters = row.filters;
      object.story_ids = _.map(row.details.stories, 'id');
      object.details = undefined;
      if (row.dirty) {
        object.dirty = true;
      }
      if (credentials.user.id !== row.target_user_id) {
        throw new HTTPError(403);
      }
    }
    return objects;
  }

  /**
   * See if a database change event is relevant to a given user
   *
   * @param  {Object} event
   * @param  {User} user
   * @param  {Subscription} subscription
   *
   * @return {boolean}
   */
  static isRelevantTo(event, user, subscription) {
    if (subscription.area === 'admin') {
      // admin console doesn't use this object currently
      return false;
    }
    if (super.isRelevantTo(event, user, subscription)) {
      if (event.current.target_user_id === user.id) {
        if (event.current.dirty) {
          // the row will be updated soon
          return false;
        }
        if (event.current.finalized) {
          // since finalization is caused by the client retrieving the
          // object, there's no point in informing it
          return false;
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Move stories from candidate list into actual list
   *
   * @param  {Database} db
   * @param  {string} schema
   * @param  {Object} row
   */
  static finalize(db, schema, row) {
    if (chooseStories(row)) {
      // save the results
      setTimeout(async () => {
        const db = await Database.open();
        this.updateOne(db, schema, {
          id: row.id,
          details: row.details,
          finalized: true,
        });
      }, 50);
    }
    setTimeout(async () => {
      const db = await Database.open();
      // finalize other listings now for consistency sake
      const criteria = {
        type: row.type,
        target_user_id: row.target_user_id,
        finalized: false,
      };
      const otherRows = await this.find(db, schema, criteria, '*')
      for (let otherRow of otherRows) {
        if (otherRow.id !== row.id) {
          if (chooseStories(otherRow)) {
            await this.updateOne(db, schema, {
              id: otherRow.id,
              details: otherRow.details,
              finalized: true,
            });
          }
        }
      }
    }, 50);
  }
}

/**
 * Move stories from candidate list into the chosen list, operating on the
 * object passed directly
 *
 * @param  {Story} row
 *
 * @return {boolean}
 */
function chooseStories(row) {
  const now = new Date;
  const limit = _.get(row.filters, 'limit', 100);
  const retention = _.get(row.filters, 'retention', 24 * HOUR);
  let newStories = _.get(row.details, 'candidates', []);
  let oldStories = _.get(row.details, 'stories', []);
  let backfillingStories = _.get(row.details, 'backfill_candidates', []);

  // we want to show as many new stories as possible
  let newStoryCount = newStories.length;
  // at the same time, we want to preserve as many old stories as we can
  let oldStoryCount = oldStories.length;
  let extra = (oldStoryCount + newStoryCount) - limit;
  if (extra > 0) {
    // well, something's got to give...
    // remove old stories that were retrieved a while ago
    for (let i = 0; extra > 0 && oldStoryCount > 0; i++) {
      const oldStory = oldStories[i];
      const elapsed = getTimeElapsed(oldStory.rtime, now)
      if (elapsed > retention) {
        extra--;
        oldStoryCount--;
      } else {
        break;
      }
    }
    if (extra > 0) {
      // still got too many--toss out some of the new ones
      const newStoryRatio = Math.min(1, newStoryCount / limit);
      const removalRatio = newStoryRatio * 0.5;
      const removeNew = Math.min(extra, Math.floor(newStoryCount * removalRatio));
      // example:
      //
      // if limit = 100 and newStoryCount = 10
      // then removalRatio = 0.05 and removeNew = 0
      //
      // if limit = 100 and newStoryCount = 20
      // then removalRatio = 0.10 and removeNew = 2
      //
      // if limit = 100 and newStoryCount = 50
      // then removalRatio = 0.25 and removeNew = 12
      //
      // if limit = 100 and newStoryCount = 100
      // then removalRatio = 0.50 and removeNew = 50
      //
      newStoryCount -= removeNew;
      extra -= removeNew;

      if (extra > 0) {
        // remove additional old stories
        const removeOld = Math.min(extra, oldStoryCount);
        oldStoryCount -= removeOld;
        extra -= removeOld;

        if (extra > 0) {
          // there're no old stories at this point, so the difference
          // must come from the list of new ones
          newStoryCount -= extra;
        }
      }
    }
  }
  if (oldStoryCount !== oldStories.length || newStories.length > 0 || backfillingStories.length > 0) {
    if (oldStoryCount !== oldStories.length) {
      // remove older stories
      oldStories = _.slice(oldStories, oldStories.length - oldStoryCount);
    }
    // remember the latest story that was considered (not necessarily going
    // to be included in the list)
    const latestStory = _.maxBy(newStories, 'btime');
    if (newStories.length > newStoryCount) {
      newStories = removeStoriesWithLowRating(newStories, row, newStoryCount);
    }
    const rtime = now.toISOString();
    let stories = addStories(oldStories, newStories, rtime);

    // see if we have the right number of stories
    const gap = limit - _.size(stories);
    if (gap > 0) {
      // backfill the gap
      if (backfillingStories.length > gap) {
        backfillingStories = removeStoriesWithLowRating(backfillingStories, row, gap);
      }
      stories = addStories(stories, backfillingStories, rtime);
    }

    const earliestStory = _.minBy(stories, 'btime');
    if (latestStory) {
      row.details.latest = latestStory.btime;
    }
    if (earliestStory) {
      row.details.earliest = earliestStory.btime;
    }
    row.details.stories = stories;
    row.details.candidates = [];
    row.details.backfill_candidates = undefined;
    // the object is going to be sent prior to being saved
    // bump up the generation number manually
    row.gn += 1;
    return true;
  } else {
    return false;
  }
}

/**
 * Return a new list with new stories added, ordered by btime
 *
 * @param  {Object[]} stories
 * @param  {Object[]} newStories
 * @param  {string} rtime
 *
 * @return {Object[]}
 */
function addStories(stories, newStories, rtime) {
  if (_.isEmpty(newStories)) {
    return stories;
  }
  stories = _.slice(stories);
  for (let story of newStories) {
    // don't need the info used to calculate rating any more
    // just attach the retrieval time
    const s = {
      id: story.id,
      btime: story.btime,
      rtime: rtime,
    };
    // insert it in the correct location based on publication or bump time
    const index = _.sortedIndexBy(stories, s, 'btime');
    stories.splice(index, 0, s);
  }
  return stories;
}

/**
 * Return a list with the desired number of stories, removing those that are
 * lowly rated
 *
 * @param  {Object[]} stories
 * @param  {Listing} listing
 * @param  {number} desiredLength
 *
 * @return {Object[]}
 */
function removeStoriesWithLowRating(stories, listing, desiredLength) {
  // apply retrieval time rating adjustments
  const context = ByRetrievalTime.createContext(stories, listing);
  for (let story of stories) {
    story.rating += ByRetrievalTime.calculateRating(context, story);
  }
  const storiesByRating = _.orderBy(stories, [ 'rating', 'btime' ], [ 'asc', 'asc' ]);
  return _.slice(storiesByRating, stories.length - desiredLength);
}

const HOUR = 60 * 60 * 1000;

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

/**
 * Generate MD5 hash of filters object
 *
 * @param  {Object} filters
 *
 * @return {string}
 */
function hash(filters) {
  const values = {};
  const keys = _.sortBy(_.keys(filters));
  for (let key of keys) {
    values[key] = filters[key];
  }
  const text = JSON.stringify(values);
  const hash = Crypto.createHash('md5').update(text);
  return hash.digest('hex');
}
