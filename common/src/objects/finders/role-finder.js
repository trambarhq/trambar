var _ = require('lodash');
var Promise = require('bluebird');
var Empty = require('data/empty');

module.exports = {
    findRole,
    findAllRoles,
    findActiveRoles,
    findRolesOfUsers,
};

/**
 * Find a role by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<Role>}
 */
function findRole(db, id) {
    return db.findOne({
        schema: 'global',
        table: 'role',
        criteria: { id },
        required: true,
    });
}

/**
 * Find all roles
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<Role>>}
 */
function findAllRoles(db) {
    return db.find({
        schema: 'global',
        table: 'role',
        criteria: {},
    });
}

/**
 * Find roles that aren't deleted or disabled
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<Role>>}
 */
function findActiveRoles(db) {
    return db.find({
        schema: 'global',
        table: 'role',
        criteria: {
            deleted: false,
            disabled: false,
        },
    });
}

/**
 * Find roles that given users have
 *
 * @param  {Database} db
 * @param  {Array<User>} users
 *
 * @return {Promise<Array<Role>>}
 */
function findRolesOfUsers(db, users) {
    // load roles that members have
    var roleIds = _.flatten(_.map(users, 'role_ids'));
    if (_.isEmpty(roleIds)) {
        return Promise.resolve(Empty.array);
    }
    roleIds = _.sortBy(_.uniq(roleIds));
    return db.find({
        schema: 'global',
        table: 'role',
        criteria: {
            id: roleIds
        }
    });
}
