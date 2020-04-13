import { uniqIds } from '../../utils/array-utils.js';
import { getDayRange } from '../../utils/date-utils.js';

const table = 'story';
const emptyArray = [];

/**
 * Find a story by ID
 *
 * @param  {Database} db
 * @param  {number} id
 *
 * @return {Story}
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
 * @param  {number[]} ids
 *
 * @return {Story}
 */
async function findStories(db, ids) {
  ids = uniqIds(ids);
  if (ids.length === 0) {
    return emptyArray;
  }
  return db.find({
    table,
    criteria: { id: ids },
  });
}

/**
 * Find stories by ids, with access check
 *
 * @param  {Database} db
 * @param  {number[]} ids
 * @param  {User} currentUser
 *
 * @return {Story}
 */
async function findViewableStories(db, ids, currentUser) {
  ids = uniqIds(ids);
  if (ids.length === 0 || !currentUser) {
    return emptyArray;
  }
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
 * @return {Story[]}
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
 * @param  {Story[]} listedStories
 * @param  {string} limit
 *
 * @return {Story[]}
 */
async function findUnlistedStories(db, user, listedStories, limit) {
  if (!user) {
    return emptyArray;
  }
  if (!listedStories) {
    return emptyArray;
  }
  const recentStories = listedStories.filter((story) => {
    if (story.user_ids.includes(user.id)) {
      if (story.ptime > limit) {
        return true;
      }
    }
  });
  const recentStoryIDs = recentStories.map(s => s.id);
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
 * @param  {string} text
 * @param  {Locale} locale
 * @param  {User} currentUser
 * @param  {number} perUserLimit
 *
 * @return {Story[]}
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
 * @param  {string[]} tags
 * @param  {User} currentUser
 * @param  {number} perUserLimit
 * @param  {number|undefined} minimum
 *
 * @return {Story[]}
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
 * @param  {string} date
 * @param  {User} currentUser
 * @param  {number} perUserLimit
 * @param  {number|undefined} minimum
 *
 * @return {Story[]}
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
 * @param  {string} type
 * @param  {User} currentUser
 * @param  {Boolean|undefined} blockIfStale
 *
 * @return {Story[]|null}
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
  if (listing.story_ids.length === 0 && listing.dirty) {
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
 * @param  {string} text
 * @param  {Locale} locale
 * @param  {User} currentUser
 *
 * @return {Story[]}
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
 * @param  {string[]} tags
 * @param  {User} currentUser
 * @param  {number|undefined} minimum
 *
 * @return {Story[]}
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
 * @param  {string} date
 * @param  {User} currentUser
 * @param  {number|undefined} minimum
 *
 * @return {Story[]}
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
 * @param  {string} type
 * @param  {User} user
 * @param  {User} currentUser
 * @param  {Boolean|undefined} blockIfStale
 *
 * @return {Story[]|null}
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
  if (listing.story_ids.length === 0 && listing.dirty) {
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
 * @param  {string} type
 * @param  {User} user
 * @param  {User} currentUser
 * @param  {number} perUserLimit
 * @param  {Boolean|undefined} blockIfStale
 *
 * @return {Story[]|null}
 */
async function findStoriesByUsersInListings(db, type, users, currentUser, perUserLimit, blockIfStale) {
  let query = {
    table: 'listing',
    criteria: {
      type: type,
      target_user_id: currentUser.id,
      filters: users.map((user) => {
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
  const listings = await db.find(query);
  const storyIDs = [];
  for (let listing of listings) {
    for (let storyID of listing.story_ids.slice(-perUserLimit)) {
      storyIDs.push(storyID);
    }
  }
  if (storyIDs.length === 0) {
    const dirty = listings.find(l => l.dirty === true);
    if (dirty) {
      return null;
    }
  }
  return findViewableStories(db, storyIDs, currentUser);
}

/**
 * Find stories by selected users in their listings
 *
 * @param  {Database} db
 * @param  {string} type
 * @param  {number[]} roleIDs
 * @param  {User} currentUser
 * @param  {Boolean|undefined} blockIfStale
 *
 * @return {Story[]|null}
 */
async function findStoriesWithRolesInListing(db, type, roleIDs, currentUser, blockIfStale) {
  if (!currentUser) {
    return emptyArray;
  }
  const query = {
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
  if (listing.story_ids.length === 0 && listing.dirty) {
    return null;
  }
  return findViewableStories(db, listing.story_ids, currentUser);
}

/**
 * Find the stories that notifications are referring to
 *
 * @param  {Database} db
 * @param  {Notification[]} notifications
 * @param  {User} currentUser
 *
 * @return {Story[]}
 */
async function findStoriesOfNotifications(db, notifications, currentUser) {
  const ids = notifications.map(n => n.story_id).filter(Boolean);
  return findViewableStories(db, ids, currentUser);
}

/**
 * Find the stories that notifications are referring to
 *
 * @param  {Database} db
 * @param  {Bookmark[]} bookmarks
 * @param  {User} currentUser
 *
 * @return {Story[]}
 */
async function findStoriesOfBookmarks(db, bookmarks, currentUser) {
  let ids = bookmarks.map(bm => bm.story_id);
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
