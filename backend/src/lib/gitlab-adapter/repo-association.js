import _ from 'lodash';
import Promise from 'bluebird';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

// accessors
import Project from 'accessors/project';
import Repo from 'accessors/repo';
import Server from 'accessors/server';

/**
 * Return a list of objects containing project, repo, and server
 *
 * @param  {Database} db
 * @param  {Object|undefined} projectCriteria
 * @param  {Object|undefined} repoCriteria
 * @param  {Object|undefined} serverCriteria
 *
 * @return {Array<Object>}
 */
function find(db, projectCriteria, repoCriteria, serverCriteria) {
    // load projects
    if (!projectCriteria) {
        projectCriteria = {
            deleted: false,
            archived: false,
        };
    }
    if (!repoCriteria) {
        repoCriteria = {
            deleted: false,
        };
    }
    if (!serverCriteria) {
        serverCriteria = {
            deleted: false,
            disabled: false,
        };
    }
    return Project.find(db, 'global', projectCriteria, '*').then((projects) => {
        // load repos
        var repoIds = _.uniq(_.flatten(_.map(projects, 'repo_ids')));
        repoCriteria = _.extend({
            id: repoIds,
            type: 'gitlab',
        }, repoCriteria);
        return Repo.find(db, 'global', repoCriteria, '*').then((repos) => {
            var serverIds = _.uniq(_.filter(_.map(repos, (repo) => {
                var repoLink = _.find(repo.external, { type: 'gitlab' });
                if (repoLink) {
                    return repoLink.server_id;
                }
            })));
            // load server record
            serverCriteria = _.extend({
                id: serverIds,
            }, serverCriteria);
            return Server.find(db, 'global', serverCriteria, '*').then((servers) => {
                var list = [];
                _.each(projects, (project) => {
                    _.each(project.repo_ids, (repoId) => {
                        var repo = _.find(repos, { id: repoId });
                        if (repo) {
                            var repoLink = _.find(repo.external, { type: 'gitlab' });
                            var server = _.find(servers, { id: repoLink.server_id });
                            if (server) {
                                list.push({ server, repo, project });
                            }
                        }
                    });
                });
                return list;
            });
        });
    });
}

/**
 * Find server, repo, and project based on their ids
 *
 * @param  {Database} db
 * @param  {Object} criteria
 *
 * @return {Promise<Object>}
 */
function findOne(db, criteria) {
    if (!_.every(criteria)) {
        return Promise.reject(new Error('Invalid object id'));
    }
    var props = {
        server: Server.findOne(db, 'global', {
            id: criteria.server_id,
            deleted: false,
            disabled: false,
        }, '*'),
        repo: Repo.findOne(db, 'global', {
            id: criteria.repo_id,
            deleted: false
        }, '*'),
        project: Project.findOne(db, 'global', {
            id: criteria.project_id,
            deleted: false,
            archived: false,
        }, '*')
    };
    return Promise.props(props).then((a) => {
        var { server, repo, project } = a;
        // make sure everything is in order first
        if (!server) {
            throw new Error(`Missing server: ${criteria.server_id}`);
        }
        if (!repo) {
            throw new Error(`Missing repository: ${criteria.repo_id}`);
        }
        if (!project) {
            throw new Error(`Missing project: ${criteria.project_id}`);
        }
        if (!_.includes(project.repo_ids, repo.id)) {
            throw new Error(`Repository "${repo.name}" (${repo.id}) is not associated with project "${project.name}"`);
        }
        if (!ExternalDataUtils.findLink(repo, server)) {
            throw new Error(`Missing server link: ${repo.name}`);
        }
        return a;
    });
}

export {
    find,
    findOne,
};
