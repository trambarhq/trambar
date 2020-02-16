const schema = 'global';
const table = 'user';

async function saveUsers(db, users) {
  const usersAfter = await db.save({ schema, table }, users);
  return usersAfter;
}

async function saveUser(db, user) {
  const [ userAfter ] = await saveUsers(db, [ user ]);
  return userAfter;
}

async function removeUsers(db, users) {
  const changes = _.map(users, (user) => {
    return { id: user.id, deleted: true };
  });
  return saveUsers(db, changes);
}

async function removeUser(db, user) {
  const [ userAfter ] = await removeUsers(db, [ user ]);
  return userAfter;
}

async function disableUsers(db, users) {
  const changes = _.map(users, (user) => {
    return { id: user.id, disabled: true };
  });
  return saveUsers(db, changes);
}

async function disableUser(db, user) {
  const [ userAfter ] = await disableUsers(db, [ user ]);
  return userAfter;
}

async function restoreUsers(db, users) {
  const changes = _.map(users, (user) => {
    return { id: user.id, deleted: false, disabled: false };
  });
  return saveUsers(db, changes);
}

async function restoreUser(db, user) {
  const [ userAfter ] = await restoreUsers(db, [ user ]);
  return userAfter;
}

async function addRole(db, users, role) {
  const changes = _.map(users, (user) => {
    return {
      id: user.id,
      role_ids: _.union(user.role_ids, [ role.id ])
    };
  });
  return saveUsers(db, changes);
}

async function removeRole(db, users, role) {
  const changes = _.map(users, (user) => {
    return {
      id: user.id,
      role_ids: _.difference(user.role_ids, [ role.id ])
    };
  });
  return saveUsers(db, changes);
}

async function removeRequestedProject(db, users, project) {
  const changes = _.map(users, (user) => {
    return {
      id: user.id,
      requested_project_ids: _.difference(user.requested_project_ids, [ project.id ])
    };
  });
  return saveUsers(db, changes);
}

export {
  saveUsers,
  saveUser,
  removeUsers,
  removeUser,
  disableUsers,
  disableUser,
  restoreUsers,
  restoreUser,

  addRole,
  removeRole,

  removeRequestedProject,
};
