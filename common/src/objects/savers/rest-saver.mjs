const table = 'rest';

async function saveRests(db, schema, rests) {
    const restsAfter = await db.save({ schema,  table }, rests);
    return restsAfter;
}

async function saveRest(db, schema, rest) {
    const [ restAfter ] = await saveRests(db, schema, [ rest ]);
    return restAfter;
}

async function disableRests(db, schema, rests) {
    const changes = _.map(rests, (rest) => {
        return { id: rest.id, disabled: true };
    });
    return saveRests(db, schema, changes);
}

async function disableRest(db, schema, rest) {
    const [ restAfter ] = await disableRests(db, schema, [ rest ]);
    return restAfter;
}

async function removeRests(db, schema, rests) {
    const changes = _.map(rests, (rest) => {
        return { id: rest.id, deleted: true };
    });
    return saveRests(db, schema, changes);
}

async function removeRest(db, schema, rest) {
    const [ restAfter ] = await removeRests(db, schema, [ rest ]);
    return restAfter;
}

async function restoreRests(db, schema, rests) {
    const changes = _.map(rests, (rest) => {
        return { id: rest.id, disabled: false, deleted: false };
    });
    return saveRests(db, schema, changes);
}

async function restoreRest(db, schema, rest) {
    const [ restAfter ] = await restoreRests(db, schema, [ rest ]);
    return restAfter;
}

export {
    saveRest,
    saveRests,
    disableRest,
    disableRests,
    removeRest,
    removeRests,
    restoreRest,
    restoreRests,
};
