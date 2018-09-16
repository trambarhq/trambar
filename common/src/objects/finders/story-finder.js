import _ from 'lodash';
import Promise from 'bluebird';
import * as DateTracker from 'utils/date-tracker';
import * as DateUtils from 'utils/date-utils';

const emptyArray = [];

/**
 * Find a story by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<Story>}
 */
function findStory(db, id) {
    return db.findOne({
        table: 'story',
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
function findStories(db, ids) {
    if (_.isEmpty(ids)) {
        return Promise.resolve(emptyArray);
    }
    ids = _.sortBy(_.uniq(ids));
    return db.find({
        table: 'story',
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
function findViewableStories(db, ids, currentUser) {
    if (_.isEmpty(ids) || !currentUser) {
        return Promise.resolve(emptyArray);
    }
    ids = _.sortBy(_.uniq(ids));
    return db.find({
        table: 'story',
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
function findDraftStories(db, user) {
    if (!user) {
        return Promise.resolve(emptyArray);
    }
    return db.find({
        table: 'story',
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
 *
 * @return {Promise<Array<Story>>}
 */
function findUnlistedStories(db, user, listedStories) {
    if (!user) {
        return Promise.resolve(emptyArray);
    }
    if (!listedStories) {
        return Promise.resolve(emptyArray);
    }
    let recentStories = _.filter(listedStories, (story) => {
        if (_.includes(story.user_ids, user.id)) {
            if (story.ptime > DateTracker.yesterdayISO) {
                return true;
            }
        }
    });
    let recentStoryIDs = _.map(recentStories, 'id');
    return db.find({
        table: 'story',
        criteria: {
            exclude: recentStoryIDs,
            user_ids: [ user.id ],
            newer_than: DateTracker.yesterdayISO,
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
function findStoriesMatchingText(db, text, locale, currentUser, perUserLimit) {
    return db.find({
        table: 'story',
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
function findStoriesWithTags(db, tags, currentUser, perUserLimit, minimum) {
    return db.find({
        table: 'story',
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
function findStoriesOnDate(db, date, currentUser, perUserLimit, minimum) {
    return db.find({
        table: 'story',
        criteria: {
            time_range: DateUtils.getDayRange(date),
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
function findStoriesInListing(db, type, currentUser, blockIfStale) {
    if (!currentUser) {
        return Promise.resolve(emptyArray);
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
    return db.findOne(query).then((listing) => {
        if (!listing) {
            // shouldn't happen, since listings are created on demand
            return null;
        }
        if (_.isEmpty(listing.story_ids) && listing.dirty) {
            // wait for the listing to become populated then try again
            return db.await({ table: 'listing' }, listing, 5000).then((changed) => {
                if (!changed) {
                    // force remote check
                    db.refresh({ table: 'listing' }, listing);
                }
                return findStoriesInListing(db, type, currentUser);
            });
        }
        return findViewableStories(db, listing.story_ids, currentUser);
    });
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
function findStoriesByUserMatchingText(db, user, text, locale, currentUser) {
    return db.find({
        table: 'story',
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
function findStoriesByUserWithTags(db, user, tags, currentUser, minimum) {
    return db.find({
        table: 'story',
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
function findStoriesByUserOnDate(db, user, date, currentUser, minimum) {
    return db.find({
        table: 'story',
        criteria: {
            user_ids: [ user.id ],
            time_range: DateUtils.getDayRange(date),
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
function findStoriesByUserInListing(db, type, user, currentUser, blockIfStale) {
    if (!currentUser) {
        return Promise.resolve(emptyArray);
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
    return db.findOne(query).then((listing) => {
        if (!listing) {
            return null;
        }
        if (_.isEmpty(listing.story_ids) && listing.dirty) {
            // wait for the listing to become populated then try again
            return db.await({ table: 'listing' }, listing, 5000).then((changed) => {
                if (!changed) {
                    // force remote check
                    db.refresh({ table: 'listing' }, listing);
                }
                return findStoriesByUserInListing(db, type, user, currentUser);
            });
        }
        return findViewableStories(db, listing.story_ids, currentUser);
    });
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
function findStoriesByUsersInListings(db, type, users, currentUser, perUserLimit, blockIfStale) {
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
    return db.find(query).then((listings) => {
        let storyIDs = _.flatten(_.map(listings, (listing) => {
            return _.slice(listing.story_ids, - perUserLimit);
        }));
        if (_.isEmpty(storyIDs)) {
            if (_.some(listings, { dirty: true })) {
                return null;
            }
        }
        return findViewableStories(db, storyIDs, currentUser);
    });
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
function findStoriesWithRolesInListing(db, type, roleIDs, currentUser, blockIfStale) {
    if (!currentUser) {
        return Promise.resolve(emptyArray);
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
    return db.findOne(query).then((listing) => {
        if (!listing) {
            return null;
        }
        if (_.isEmpty(listing.story_ids) && listing.dirty) {
            return null;
        }
        return findViewableStories(db, listing.story_ids, currentUser);
    });
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
function findStoriesOfNotifications(db, notifications, currentUser) {
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
function findStoriesOfBookmarks(db, bookmarks, currentUser) {
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
