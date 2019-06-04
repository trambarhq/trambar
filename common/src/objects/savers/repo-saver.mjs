const schema = 'global';
const table = 'repo';

async function saveRepos(db, repos) {
    const repoAfter = await db.save({ schema, table }, repos);
    return repoAfter;
}
