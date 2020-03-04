const schema = 'global';
const table = 'repo';

async function saveRepos(db, repos) {
  const reposAfter = await db.save({ schema, table }, repos);
  return reposAfter;
}

async function saveRepo(db, repo) {
  const [ repoAfter ] = await saveRepos(db, [ repo ]);
  return repoAfter;
}

export {
  saveRepos,
  saveRepo,
};
