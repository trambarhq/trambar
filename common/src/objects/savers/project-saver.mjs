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

async function updateRepoList(db, project, repoIDs) {
    return saveProject(db, { id: project.id, repo_ids: repoIDs });
}

async function addToRepoList(db, project, repoIDs) {
    const newList = _.union(project.repo_ids, repoIDs);
    return updateRepoList(db, project, newList);
}

async function removeFromRepoList(db, project, repoIDs) {
    const newList = _.difference(project.repo_ids, repoIDs);
    return updateRepoList(db, project, repoIDs);
}

async function updateMemberList(db, project, userIDs) {
    return saveProject(db, { id: project.id, user_ids: userIDs });
}

async function addToMemberList(db, project, userIDs) {
    const newList = _.union(project.repo_ids, userIDs);
    return updateMemberList(db, project, newList);
}

async function removeFromMemberList(db, project, userIDs) {
    const newList = _.difference(project.user_ids, userIDs);
    return updateMemberList(db, project, newList);
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
    updateRepoList,
    addToRepoList,
    removeFromRepoList,
    updateMemberList,
    addToMemberList,
    removeFromMemberList,
};
