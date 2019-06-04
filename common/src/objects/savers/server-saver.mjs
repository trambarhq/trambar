const schema = 'global';
const table = 'server';

async function saveServers(db, servers) {
    const serversAfter = await db.save({ schema, table }, servers);
    return serversAfter;
}

async function saveServer(db, server) {
    const [ serverAfter ] = await saveServers(db, [ server ]);
    return serverAfter;
}

async function removeServers(db, servers) {
    const changes = _.map(servers, (server) => {
        return { id: server.id, deleted: true };
    });
    return saveServers(db, changes);
}

async function removeServer(db, server) {
    const [ serverAfter ] = await removeServers(db, [ server ]);
    return serverAfter;
}

async function disableServers(db, servers) {
    const changes = _.map(servers, (server) => {
        return { id: server.id, disabled: true };
    });
    return saveServers(db, changes);
}

async function disableServer(db, server) {
    const [ serverAfter ] = await disableServers(db, [ server ]);
    return serverAfter;
}

async function restoreServers(db, servers) {
    const changes = _.map(servers, (server) => {
        return { id: server.id, disabled: false, deleted: false };
    });
    return saveServers(db, changes);
}

async function restoreServer(db, server) {
    const [ serverAfter ] = await restoreServers(db, [ server ]);
    return serverAfter;
}

export {
    saveServer,
    saveServers,
    removeServer,
    removeServers,
    disableServer,
    disableServers,
    restoreServer,
    restoreServers,
};
