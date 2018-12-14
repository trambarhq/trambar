import _ from 'lodash';
import Promise from 'bluebird';
import HTTPError from 'errors/http-error';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

// accessors
import Project from 'accessors/project';
import Repo from 'accessors/repo';
import Server from 'accessors/server';

/**
 * Return a list of objects containing project, repo, and server
 *
 * @param  {Database} db
 * @param  {Object|undefined} criteria
 *
 * @return {Array<Object>}
 */
async function find(db, criteria) {
    let projectCriteria = {
        deleted: false,
        archived: false,
    };
    let repoCriteria = {
        deleted: false,
    };
    let serverCriteria = {
        deleted: false,
        disabled: false,
    };
    if (criteria) {
        if (criteria.project) {
            projectCriteria = _.clone(criteria.project);
        }
        if (criteria.repo) {
            repoCriteria = _.clone(criteria.repo);
        }
        if (criteria.server) {
            serverCriteria = _.clone(criteria.server);
        }
    }
    let projects = await Project.find(db, 'global', projectCriteria, '*');
    // load repos
    let repoIDs = _.uniq(_.flatten(_.map(projects, 'repo_ids')));
    repoCriteria = _.extend({ id: repoIDs, type: 'gitlab' }, repoCriteria);
    let repos = await Repo.find(db, 'global', repoCriteria, '*');
    // load server record
    let serverIDs = _.uniq(_.filter(_.map(repos, (repo) => {
        let repoLink = _.find(repo.external, { type: 'gitlab' });
        if (repoLink) {
            return repoLink.server_id;
        }
    })));
    serverCriteria = _.extend({ id: serverIDs }, serverCriteria);
    let servers = await Server.find(db, 'global', serverCriteria, '*');
    let list = [];
    for (let project of projects) {
        for (let repoID of project.repo_ids) {
            let repo = _.find(repos, { id: repoID });
            if (repo) {
                let repoLink = _.find(repo.external, { type: 'gitlab' });
                let server = _.find(servers, { id: repoLink.server_id });
                if (server) {
                    list.push({ server, repo, project });
                }
            }
        }
    }
    return list;
}

/**
 * Find server, repo, and project based on their ids
 *
 * @param  {Database} db
 * @param  {Object} criteria
 *
 * @return {Promise<Object>}
 */
async function findOne(db, criteria) {
    let projectCriteria = _.clone(criteria.project);
    let repoCriteria = _.clone(criteria.repo);
    let serverCriteria = _.clone(criteria.server);

    let server = await Server.findOne(db, 'global', serverCriteria, '*');
    let repo = await Repo.findOne(db, 'global', repoCriteria, '*');
    let project = await Project.findOne(db, 'global', projectCriteria, '*');

    // make sure everything is in order first
    if (!server) {
        throw new HTTPError(404, `Missing server:`, serverCriteria);
    }
    if (!repo) {
        throw new HTTPError(404, `Missing repository:`, repoCriteria);
    }
    if (!project) {
        throw new HTTPError(404, `Missing project:`, projectCriteria);
    }
    if (!_.includes(project.repo_ids, repo.id)) {
        throw new HTTPError(400, `Repository "${repo.name}" (${repo.id}) is not associated with project "${project.name}"`);
    }
    if (!ExternalDataUtils.findLink(repo, server)) {
        throw new HTTPError(400, `Missing server link: ${repo.name}`);
    }
    return { server, repo, project };
}

export {
    find,
    findOne,
};
