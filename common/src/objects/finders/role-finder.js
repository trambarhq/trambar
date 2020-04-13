import { uniqIds } from '../../utils/array-utils.js';

const schema = 'global';
const table = 'role';
const emptyArray = [];

/**
 * Find a role by ID
 *
 * @param  {Database} db
 * @param  {number} id
 *
 * @return {Role}
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
 * @param  {number|undefined} minimum
 *
 * @return {Role[]}
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
 * @param  {number|undefined} minimum
 *
 * @return {Role[]}
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
 * @param  {User[]} users
 *
 * @return {Role[]}
 */
async function findRolesOfUsers(db, users) {
  // load roles that members have
  const roleIDs = uniqIds(users.map(usr => usr.role_ids));
  if (roleIDs.length === 0) {
    return emptyArray;
  }
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
