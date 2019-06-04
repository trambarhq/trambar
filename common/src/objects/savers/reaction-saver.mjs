async function saveReaction(db, reaction) {
    return await db.saveOne({ table: 'reaction' }, reaction);
}

async function removeReaction(db, reaction) {
    return await db.removeOne({ table: 'reaction' }, reaction);
}
