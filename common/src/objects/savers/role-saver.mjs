const schema = 'global';
const table = 'role';

async function saveRoles(db, roles) {
    const rolesAfter = await db.save({ schema,  table }, roles);
    return rolesAfter;
}

async function saveRole(db, role) {
    const [ roleAfter ] = await saveRoles(db, [ role ]);
    return roleAfter;
}

async function disableRoles(db, roles) {
    const changes = _.map(roles, (role) => {
        return { id: role.id, disabled: true };
    });
    return saveRoles(db, changes);
}

async function disableRole(db, role) {
    const [ roleAfter ] = await disableRoles(db, [ role ]);
    return roleAfter;
}

async function removeRoles(db, role) {
    const changes = _.map(roles, (role) => {
        return { id: role.id, deleted: true };
    });
    return saveRoles(db, changes);
}

async function removeRole(db, role) {
    const [ roleAfter ] = await removeRoles(db, [ role ]);
    return roleAfter;
}

async function restoreRoles(db, roles) {
    const changes = _.map(roles, (role) => {
        return { id: role.id, disabled: false, deleted: false };
    });
    return saveRoles(db, changes);
}

async function restoreRole(db, role) {
    const [ roleAfter ] = await restoreRoles(db, [ role ]);
    return roleAfter;
}

export {
    saveRole,
    saveRoles,
    disableRole,
    disableRoles,
    removeRole,
    removeRoles,
    restoreRole,
    restoreRoles,
};
