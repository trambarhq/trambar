import _ from 'lodash';

const schema = 'global';
const table = 'role';
const emptyArray = [];

/**
 * Find a role by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<Role>}
 */
async function findRole(db, id) {
  return db.findOne({
    schema,
    table,
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
async function findAllRoles(db, minimum) {
  return db.find({
    schema,
    table,
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
async function findActiveRoles(db, minimum) {
  return db.find({
    schema,
    table,
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
async function findRolesOfUsers(db, users) {
  // load roles that members have
  let roleIDs = _.flatten(_.map(users, 'role_ids'));
  if (_.isEmpty(roleIDs)) {
    return emptyArray;
  }
  roleIDs = _.sortBy(_.uniq(roleIDs));
  return db.find({
    schema,
    table,
    criteria: {
      id: roleIDs,
      disabled: false,
    }
  });
}

export {
  findRole,
  findAllRoles,
  findActiveRoles,
  findRolesOfUsers,
};
