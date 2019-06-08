import _ from 'lodash';

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
    const changes = _.map(projects, (project) => {
        return { id: project.id, archived: true };
    });
    return saveProjects(db, changes);
}

async function archiveProject(db, project) {
    const [ projectAfter ] = await archiveProjects(db, [ project ]);
    return projectAfter;
}

async function removeProjects(db, projects) {
    const changes = _.map(projects, (project) => {
        return { id: project.id, deleted: true };
    });
    return saveProjects(db, changes);
}

async function removeProject(db, project) {
    const [ projectAfter ] = await removeProjects(db, [ project ]);
    return projectAfter;
}

async function restoreProjects(db, projects) {
    const changes = _.map(projects, (project) => {
        return { id: project.id, archived: false, deleted: false };
    });
    return saveProjects(db, changes);
}

async function restoreProject(db, project) {
    const [ projectAfter ] = await restoreProjects(db, [ project ]);
    return projectAfter;
}

async function associateRepos(db, project, repos) {
    const repoIDs = _.map(repos, 'id');
    return saveProject(db, { id: project.id, repo_ids: repoIDs });
}

async function addRepos(db, project, repos) {
    const repoIDs = _.union(project.repo_ids, _.map(repos, 'id'));
    return saveProject(db, { id: project.id, repo_ids: repoIDs });
}

async function removeRepos(db, project, repos) {
    const repoIDs = _.difference(project.repo_ids, _.map(repos, 'id'));
    return saveProject(db, { id: project.id, repo_ids: repoIDs });
}

async function associateUsers(db, project, users) {
    const userIDs = _.map(users, 'id');
    return saveProject(db, { id: project.id, user_ids: userIDs });
}

async function addUsers(db, project, users) {
    const userIDs = _.union(project.repo_ids, _.map(users, 'id'));
    return saveProject(db, { id: project.id, user_ids: userIDs });
}

async function removeUsers(db, project, users) {
    const userIDs = _.difference(project.repo_ids, _.map(users, 'id'));
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
    addRepos,
    removeRepos,

    associateUsers,
    addUsers,
    removeUsers,
};
