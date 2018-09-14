import _ from 'lodash';
import Promise from 'bluebird';
import Empty from 'data/empty';

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
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Role>>}
 */
function findAllRoles(db, minimum) {
    return db.find({
        schema: 'global',
        table: 'role',
        criteria: {},
        minimum
    });
}

/**
 * Find roles that aren't deleted or disabled
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Role>>}
 */
function findActiveRoles(db, minimum) {
    return db.find({
        schema: 'global',
        table: 'role',
        criteria: {
            deleted: false,
            disabled: false,
        },
        minimum
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
    let roleIDs = _.flatten(_.map(users, 'role_ids'));
    if (_.isEmpty(roleIDs)) {
        return Promise.resolve(Empty.array);
    }
    roleIDs = _.sortBy(_.uniq(roleIDs));
    return db.find({
        schema: 'global',
        table: 'role',
        criteria: {
            id: roleIDs
        }
    });
}

export {
    findRole,
    findAllRoles,
    findActiveRoles,
    findRolesOfUsers,
    exports as default,
};
