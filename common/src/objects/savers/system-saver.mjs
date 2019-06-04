const schema = 'global';
const table = 'system';

async function saveSystem(db, system) {
    const systemAfter = await db.saveOne({ schema, table }, system);
    return systemAfter;
}

export {
    saveSystem,
};
