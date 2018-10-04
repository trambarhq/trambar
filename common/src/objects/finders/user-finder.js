import _ from 'lodash';
import Promise from 'bluebird';

const emptyArray = [];

/**
 * Find a user by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<User>}
 */
function findUser(db, id) {
    return db.findOne({
        schema: 'global',
        table: 'user',
        criteria: { id },
        required: true
    });
}

/**
 * Find users by IDs
 *
 * @param  {Database} db
 * @param  {Array<Number>} ids
 *
 * @return {Promise<User>}
 */
function findUsers(db, ids) {
    if (_.isEmpty(ids)) {
        return Promise.resolve(emptyArray);
    }
    ids = _.sortBy(_.uniq(ids));
    return db.find({
        schema: 'global',
        table: 'user',
        criteria: { id: ids },
    });
}

/**
 * Find all users
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<User>}
 */
function findAllUsers(db, minimum) {
    return db.find({
        schema: 'global',
        table: 'user',
        criteria: {},
        minimum
    });
}

/**
 * Find users who're members of given project(s)
 *
 * @param  {Database} db
 * @param  {Project|Array<Project>} projects
 *
 * @return {Promise<User>}
 */
function findProjectMembers(db, projects) {
    let userIDs;
    if (projects instanceof Array) {
        userIDs = _.flatten(_.map(projects, 'user_ids'));
    } else {
        let project = projects;
        userIDs = _.get(project, 'user_ids');
    }
    return findUsers(db, userIDs);
}

/**
 * Find users who aren't deleted
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<User>}
 */
function findExistingUsers(db, minimum) {
    return db.find({
        schema: 'global',
        table: 'user',
        criteria: { deleted: false },
        minimum
    });
}

/**
 * Find users who aren't deleted or disabled
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<User>}
 */
function findActiveUsers(db, minimum) {
    return db.find({
        schema: 'global',
        table: 'user',
        criteria: {
            deleted: false,
            disabled: false,
        },
        minimum
    });
}

/**
 * Find users with given roles
 *
 * @param  {Database} db
 * @param  {Array<Role>} roles
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<User>}
 */
function findUsersWithRoles(db, roles, minimum) {
    let ids = _.map(roles, 'id');
    ids = _.sortBy(_.uniq(ids));
    return db.find({
        schema: 'global',
        table: 'user',
        criteria: { role_ids: ids },
        minimum
    });
}

/**
 * Find users who're authors or co-authors of given stories
 *
 * @param  {Database} db
 * @param  {Array<Story>} stories
 *
 * @return {Promise<User>}
 */
function findStoryAuthors(db, stories) {
    let userIDs = _.flatten(_.map(stories, 'user_ids'));
    return findUsers(db, userIDs);
}

/**
 * Find users who wrote a comment or liked a story
 *
 * @param  {Database} db
 * @param  {Array<Reaction>} reactions
 *
 * @return {Promise<User>}
 */
function findReactionAuthors(db, reactions) {
    let userIDs = _.map(reactions, 'user_id');
    return findUsers(db, userIDs);
}

/**
 * Find users to whom bookmarks were sent
 *
 * @param  {Database} db
 * @param  {Array<Bookmark>} bookmarks
 *
 * @return {Promise<User>}
 */
function findBookmarkRecipients(db, bookmarks) {
    let userIDs = _.map(bookmarks, 'target_user_id');
    return findUsers(db, userIDs);
}

/**
 * Find users who sent the bookmarks
 *
 * @param  {Database} db
 * @param  {Array<Bookmark>} bookmarks
 *
 * @return {Promise<User>}
 */
function findBookmarkSenders(db, bookmarks) {
    let userIDs = _.flatten(_.map(bookmarks, 'user_ids'));
    return findUsers(db, userIDs);
}

/**
 * Find users whose action is being notified
 *
 * @param  {Database} db
 * @param  {Array<Reaction>} reactions
 *
 * @return {Promise<User>}
 */
function findNotificationTriggerers(db, notifications) {
    let userIDs = _.map(notifications, 'user_id');
    return findUsers(db, userIDs);
}

export {
    findUser,
    findUsers,
    findAllUsers,
    findUsersWithRoles,
    findProjectMembers,
    findExistingUsers,
    findActiveUsers,
    findStoryAuthors,
    findReactionAuthors,
    findBookmarkRecipients,
    findBookmarkSenders,
    findNotificationTriggerers,
};
