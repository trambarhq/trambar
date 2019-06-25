import Database from '../database.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as TaskLog from '../task-log.mjs';

import Project from './lib/accessors/project.mjs';
import Repo from '../accessors/repo.mjs';
import Server from '../accessors/server.mjs';
import Template from '../accessors/template.mjs';

import * as Transport from './transport.mjs';

async function retrieveFile(schema, commit, type, path) {
    const taskLog = TaskLog.start('template-retrieve', {
        project: schema,
        commit,
    });
    try {
        // find template used by project and repo in which it's stored
        const db = await Database.open();
        const projectCriteria = {
            name: schema,
            deleted: false,
        };
        const project = await Project.findOne(db, 'global', projectCriteria, 'template_id');
        if (!project) {
            throw new HTTPError(404);
        }
        const templateCriteria = {
            id: project.template_id,
            deleted: false,
        };
        const template = await Template.findOne(db, 'global', templateCriteria, '*');
        if (!template) {
            throw new HTTPError(404);
        }
        const repoCriteria = {
            id: template.repo_id,
            deleted: false,
        };
        const repo = await Repo.findOne(db, 'global', repoCriteria, '*');
        if (!repo) {
            throw new HTTPError(404);
        }

        // get the server
        const repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
        const serverCriteria = {
            id: repoLink.server_id,
            deleted: false,
            disabled: false,
        };
        const server = await Server.findOne(db, 'global', serverCriteria, '*');
        if (!server) {
            throw new HTTPError(404);
        }

        // get file from GitLab
        const filePath = `${type}/${path}`;
        taskLog.describe(`retrieving ${filePath} from ${repo.name}`);
        const projectID = repoLink.project.id;
        const pathEncoded = encodeURIComponent(filePath);
        const url = `/projects/${projectID}/repository/files/${pathEncoded}`;
        const query = { ref: cxt.headID };
        const file = await Transport.fetch(server, url, query);
        const buffer = Buffer.from(file.content, 'base64');

        taskLog.set('repo', repo.name);
        taskLog.set('type', type);
        taskLog.set('path', path);
        await taskLog.finish();
        return buffer;
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

export {
    retrieveFile,
};
