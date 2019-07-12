const schema = 'global';
const table = 'snapshot';
const emptyArray = [];

/**
 * Find a spreadsheet by id
 *
 * @param  {Database} db
 * @param  {Repo} repo
 *
 * @return {Promise<Snapshot>}
 */
function findSnapshots(db, repo) {
    if (!repo) {
        return emptyArray;
    }
    return db.find({
        schema,
        table,
        criteria: {
            repo_id: repo.id,
            deleted: false,
        },
    });
}

export {
    findSnapshots,
};
