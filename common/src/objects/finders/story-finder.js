import _ from 'lodash';
import { getDayRange } from '../../utils/date-utils.js';

const table = 'story';
const emptyArray = [];

/**
 * Find a story by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<Story>}
 */
async function findStory(db, id) {
  return db.findOne({
    table,
    criteria: { id },
    required: true,
  });
}

/**
 * Find a stories by ids
 *
 * @param  {Database} db
 * @param  {Array<Number>} ids
 *
 * @return {Promise<Story>}
 */
async function findStories(db, ids) {
  if (_.isEmpty(ids)) {
    return emptyArray;
  }
  ids = _.sortBy(_.uniq(ids));
  return db.find({
    table,
    criteria: { id: ids },
  });
}

/**
 * Find stories by ids, with access check
 *
 * @param  {Database} db
 * @param  {Array<Number>} ids
 * @param  {User} currentUser
 *
 * @return {Promise<Story>}
 */
async function findViewableStories(db, ids, currentUser) {
  if (_.isEmpty(ids) || !currentUser) {
    return emptyArray;
  }
  ids = _.sortBy(_.uniq(ids));
  return db.find({
    table,
    criteria: {
      id: ids,
      published: true,
      ready: true,
      public: publicOnly(currentUser),
    },
  });
}

/**
 * Find draft stories for which the user is an author
 *
 * @param  {Database} db
 * @param  {User} user
 *
 * @return {Promise<Array<Story>>}
 */
async function findDraftStories(db, user) {
  if (!user) {
    return emptyArray;
  }
  return db.find({
    table,
    criteria: {
      published: false,
      user_ids: [ user.id ],
    },
  });
}

/**
 * Find published stories by user that haven't yet found their way into story listing
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {Array<Story>} listedStories
 * @param  {String} limit
 *
 * @return {Promise<Array<Story>>}
 */
async function findUnlistedStories(db, user, listedStories, limit) {
  if (!user) {
    return emptyArray;
  }
  if (!listedStories) {
    return emptyArray;
  }
  let recentStories = _.filter(listedStories, (story) => {
    if (_.includes(story.user_ids, user.id)) {
      if (story.ptime > limit) {
        return true;
      }
    }
  });
  let recentStoryIDs = _.map(recentStories, 'id');
  return db.find({
    table,
    criteria: {
      exclude: recentStoryIDs,
      user_ids: [ user.id ],
      newer_than: limit,
      published: true,
    },
  });
}

/**
 * Find published stories that match a search string
 *
 * @param  {Database} db
 * @param  {String} text
 * @param  {Locale} locale
 * @param  {User} currentUser
 * @param  {Number} perUserLimit
 *
 * @return {Promise<Array<Story>>}
 */
async function findStoriesMatchingText(db, text, locale, currentUser, perUserLimit) {
  return db.find({
    table,
    criteria: {
      search: {
        lang: locale.languageCode,
        text: text,
      },
      published: true,
      ready: true,
      public: publicOnly(currentUser),
      limit: (!perUserLimit) ? 100 : undefined,
      per_user_limit: perUserLimit,
    },
    remote: true,
  });
}

/**
 * Find published stories that have the specified tags
 *
 * @param  {Database} db
 * @param  {Array<String>} tags
 * @param  {User} currentUser
 * @param  {Number} perUserLimit
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Story>>}
 */
async function findStoriesWithTags(db, tags, currentUser, perUserLimit, minimum) {
  return db.find({
    table,
    criteria: {
      tags: tags,
      published: true,
      ready: true,
      public: publicOnly(currentUser),
      limit: (!perUserLimit) ? 500 : undefined,
      per_user_limit: perUserLimit,
    },
    minimum
  });
}

/**
 * Find stories by a user that were published on a given date
 *
 * @param  {Database} db
 * @param  {String} date
 * @param  {User} currentUser
 * @param  {Number} perUserLimit
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Story>>}
 */
async function findStoriesOnDate(db, date, currentUser, perUserLimit, minimum) {
  return db.find({
    table,
    criteria: {
      time_range: getDayRange(date),
      published: true,
      ready: true,
      public: publicOnly(currentUser),
      limit: (!perUserLimit) ? 500 : undefined,
      per_user_limit: perUserLimit,
    },
    minimum
  });
}

/**
 * Find stories in listing for current user
 *
 * @param  {Database} db
 * @param  {String} type
 * @param  {User} currentUser
 * @param  {Boolean|undefined} blockIfStale
 *
 * @return {Promise<Array<Story>|null>}
 */
async function findStoriesInListing(db, type, currentUser, blockIfStale) {
  if (!currentUser) {
    return emptyArray;
  }
  let query = {
    table: 'listing',
    criteria: {
      type: type,
      target_user_id: currentUser.id,
      filters: {
        public: publicOnly(currentUser)
      },
    },
    prefetch: true,
  };
  if (blockIfStale) {
    query.blocking = 'stale';
  }
  let listing = await db.findOne(query);
  if (!listing) {
    // shouldn't happen, since listings are created on demand
    throw new Error('No story listing');
  }
  if (_.isEmpty(listing.story_ids) && listing.dirty) {
    // wait for the listing to become populated then try again
    let changed = await db.waitForChange({ table: 'listing' }, listing, 5000);
    if (!changed) {
      // force remote check
      db.refresh({ table: 'listing' }, listing);
    }
    return findStoriesInListing(db, type, currentUser);
  }
  return findViewableStories(db, listing.story_ids, currentUser);
}

/**
 * Find stories by a user that were published on a given date
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {String} text
 * @param  {Locale} locale
 * @param  {User} currentUser
 *
 * @return {Promise<Array<Story>>}
 */
async function findStoriesByUserMatchingText(db, user, text, locale, currentUser) {
  return db.find({
    table,
    criteria: {
      user_ids: [ user.id ],
      search: {
        lang: locale.languageCode,
        text: text,
      },
      published: true,
      ready: true,
      public: publicOnly(currentUser),
      limit: 100,
    },
    remote: true,
  });
}

/**
 * Find published stories by a user that have the specified tags
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {Array<String>} tags
 * @param  {User} currentUser
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Story>>}
 */
async function findStoriesByUserWithTags(db, user, tags, currentUser, minimum) {
  return db.find({
    table,
    criteria: {
      user_ids: [ user.id ],
      tags: tags,
      published: true,
      ready: true,
      public: publicOnly(currentUser),
      limit: 500,
    },
    minimum
  });
}

/**
 * Find stories by a user that were published on a given date
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {String} date
 * @param  {User} currentUser
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Story>>}
 */
async function findStoriesByUserOnDate(db, user, date, currentUser, minimum) {
  return db.find({
    table,
    criteria: {
      user_ids: [ user.id ],
      time_range: getDayRange(date),
      published: true,
      ready: true,
      public: publicOnly(currentUser),
      limit: 500,
    },
    minimum
  });
}

/**
 * Find stories by a particular user in a listing
 *
 * @param  {Database} db
 * @param  {String} type
 * @param  {User} user
 * @param  {User} currentUser
 * @param  {Boolean|undefined} blockIfStale
 *
 * @return {Promise<Array<Story>|null>}
 */
async function findStoriesByUserInListing(db, type, user, currentUser, blockIfStale) {
  if (!currentUser) {
    return emptyArray;
  }
  let query = {
    table: 'listing',
    criteria: {
      type: type,
      target_user_id: currentUser.id,
      filters: {
        user_ids: [ user.id ],
        public: publicOnly(currentUser)
      },
    },
    prefetch: true,
  };
  if (blockIfStale) {
    query.blocking = 'stale';
  }
  let listing = await db.findOne(query);
  if (!listing) {
    return null;
  }
  if (_.isEmpty(listing.story_ids) && listing.dirty) {
    // wait for the listing to become populated then try again
    let changed = await db.waitForChange({ table: 'listing' }, listing, 5000);
    if (!changed) {
      // force remote check
      db.refresh({ table: 'listing' }, listing);
    }
    return findStoriesByUserInListing(db, type, user, currentUser);
  }
  return findViewableStories(db, listing.story_ids, currentUser);
}

/**
 * Find stories by selected users in their listings
 *
 * @param  {Database} db
 * @param  {String} type
 * @param  {User} user
 * @param  {User} currentUser
 * @param  {Number} perUserLimit
 * @param  {Boolean|undefined} blockIfStale
 *
 * @return {Promise<Array<Story>|null>}
 */
async function findStoriesByUsersInListings(db, type, users, currentUser, perUserLimit, blockIfStale) {
  let query = {
    table: 'listing',
    criteria: {
      type: type,
      target_user_id: currentUser.id,
      filters: _.map(users, (user) => {
        return {
          user_ids: [ user.id ],
          public: publicOnly(currentUser)
        }
      }),
    },
    prefetch: true,
  };
  if (blockIfStale) {
    query.blocking = 'stale';
  }
  let listings = await db.find(query);
  let storyIDs = _.flatten(_.map(listings, (listing) => {
    return _.slice(listing.story_ids, - perUserLimit);
  }));
  if (_.isEmpty(storyIDs)) {
    if (_.some(listings, { dirty: true })) {
      return null;
    }
  }
  return findViewableStories(db, storyIDs, currentUser);
}

/**
 * Find stories by selected users in their listings
 *
 * @param  {Database} db
 * @param  {String} type
 * @param  {Array<Number>} roleIDs
 * @param  {User} currentUser
 * @param  {Boolean|undefined} blockIfStale
 *
 * @return {Promise<Array<Story>|null>}
 */
async function findStoriesWithRolesInListing(db, type, roleIDs, currentUser, blockIfStale) {
  if (!currentUser) {
    return emptyArray;
  }
  let query = {
    table: 'listing',
    criteria: {
      type: type,
      target_user_id: currentUser.id,
      filters: {
        role_ids: roleIDs,
        public: publicOnly(currentUser)
      },
    },
    prefetch: true,
  };
  if (blockIfStale) {
    query.blocking = 'stale';
  }
  let listing = await db.findOne(query);
  if (!listing) {
    return null;
  }
  if (_.isEmpty(listing.story_ids) && listing.dirty) {
    return null;
  }
  return findViewableStories(db, listing.story_ids, currentUser);
}

/**
 * Find the stories that notifications are referring to
 *
 * @param  {Database} db
 * @param  {Array<Notification>r} notifications
 * @param  {User} currentUser
 *
 * @return {Promise<Array<Story>>}
 */
async function findStoriesOfNotifications(db, notifications, currentUser) {
  let ids = _.filter(_.map(notifications, 'story_id'));
  return findViewableStories(db, ids, currentUser);
}

/**
 * Find the stories that notifications are referring to
 *
 * @param  {Database} db
 * @param  {Array<Bookmark>} bookmarks
 * @param  {User} currentUser
 *
 * @return {Promise<Array<Story>>}
 */
async function findStoriesOfBookmarks(db, bookmarks, currentUser) {
  let ids = _.map(bookmarks, 'story_id');
  return findViewableStories(db, ids, currentUser);
}

function publicOnly(currentUser) {
  if (!currentUser || currentUser.type === 'guest') {
    return true;
  }
}

export {
  findStory,
  findStories,
  findDraftStories,
  findUnlistedStories,
  findStoriesMatchingText,
  findStoriesWithTags,
  findStoriesOnDate,
  findStoriesInListing,
  findStoriesByUserMatchingText,
  findStoriesByUserWithTags,
  findStoriesByUserOnDate,
  findStoriesByUserInListing,
  findStoriesByUsersInListings,
  findStoriesWithRolesInListing,
  findStoriesOfNotifications,
  findStoriesOfBookmarks,
};
