import { union, difference } from '../../utils/array-utils.js';

const schema = 'global';
const table = 'project';

async function saveProjects(db, projects) {
  const projectsAfter = await db.save({ schema, table }, projects);
  return projectsAfter;
}

async function saveProject(db, project) {
  const [ projectAfter ] = await saveProjects(db, [ project ]);
  return projectAfter;
}

async function archiveProjects(db, projects) {
  const changes = projects.map((project) => {
    return { id: project.id, archived: true };
  });
  return saveProjects(db, changes);
}

async function archiveProject(db, project) {
  const [ projectAfter ] = await archiveProjects(db, [ project ]);
  return projectAfter;
}

async function removeProjects(db, projects) {
  const changes = projects.map((project) => {
    return { id: project.id, deleted: true };
  });
  return saveProjects(db, changes);
}

async function removeProject(db, project) {
  const [ projectAfter ] = await removeProjects(db, [ project ]);
  return projectAfter;
}

async function restoreProjects(db, projects) {
  const changes = projects.map((project) => {
    return { id: project.id, archived: false, deleted: false };
  });
  return saveProjects(db, changes);
}

async function restoreProject(db, project) {
  const [ projectAfter ] = await restoreProjects(db, [ project ]);
  return projectAfter;
}

async function associateRepos(db, project, repos) {
  const repoIDs = repos.map(r => r.id);
  return saveProject(db, { id: project.id, repo_ids: repoIDs });
}

async function attachRepos(db, project, repos) {
  const repoIDs = union(project.repo_ids, repos.map(r => r.id));
  return saveProject(db, { id: project.id, repo_ids: repoIDs });
}

async function detachRepos(db, project, repos) {
  const repoIDs = difference(project.repo_ids, repos.map(r => r.id));
  return saveProject(db, { id: project.id, repo_ids: repoIDs });
}

async function associateUsers(db, project, users) {
  const userIDs = users.map(usr => usr.id);
  return saveProject(db, { id: project.id, user_ids: userIDs });
}

async function addMembers(db, project, users) {
  const userIDs = union(project.user_ids, users.map(usr => usr.id));
  return saveProject(db, { id: project.id, user_ids: userIDs });
}

async function removeMembers(db, project, users) {
  const userIDs = difference(project.user_ids, users.map(usr => usr.id));
  return saveProject(db, { id: project.id, user_ids: userIDs });
}

export {
  saveProject,
  saveProjects,
  archiveProject,
  archiveProjects,
  removeProject,
  removeProjects,
  restoreProject,
  restoreProjects,

  associateRepos,
  attachRepos,
  attachRepos as addRepos,
  detachRepos,
  detachRepos as removeRepos,

  associateUsers,
  addMembers,
  addMembers as addUsers,
  removeMembers,
  removeMembers as removeUsers,
};
