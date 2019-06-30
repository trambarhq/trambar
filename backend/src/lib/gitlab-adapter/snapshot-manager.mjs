import Database from '../database.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as TaskLog from '../task-log.mjs';

import Project from '../accessors/project.mjs';
import Repo from '../accessors/repo.mjs';
import Server from '../accessors/server.mjs';
import Snapshot from '../accessors/snapshot.mjs';

import * as Transport from './transport.mjs';

const availableFileTypes = [ 'www', 'ssr' ];

async function retrieveFile(schema, tag, type, path) {
    const taskLog = TaskLog.start('snapshot-retrieve', {
        project: schema,
        tag,
    });
    try {
        // find repo in which the template is stored
        const db = await Database.open();
        const projectCriteria = {
            name: schema,
            deleted: false,
        };
        const project = await Project.findOne(db, 'global', projectCriteria, '*');
        if (!project) {
            throw new HTTPError(404);
        }
        const repoCriteria = {
            id: project.template_repo_id,
            deleted: false,
        };
        const repo = await Repo.findOne(db, 'global', repoCriteria, '*');
        if (!repo) {
            throw new HTTPError(404);
        }
        if (!repo.template) {
            throw new HTTPError(403);
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

        let commitID;
        if (isCommitID(tag)) {
            commitID = tag;
        } else {
            // a branch name--find the commit at the head
            const snapshotCriteria = {
                repo_id: repo.id,
                branch_name: tag,
                head: true,
                deleted: false,
            };
            const snapshot = await Snapshot.findOne(db, 'global', snapshotCriteria, '*');
            if (!snapshot) {
                throw new HTTPError(404);
            }
            commitID = snapshot.commit_id;
        }

        if (!_.includes(availableFileTypes, type)) {
            throw new HTTPError(403);
        }

        // get file from GitLab
        const filePath = `${type}/${path}`;
        taskLog.describe(`retrieving ${filePath} from ${repo.name}`);
        const projectID = repoLink.project.id;
        const pathEncoded = encodeURIComponent(filePath);
        const url = `/projects/${projectID}/repository/files/${pathEncoded}`;
        const query = { ref: commitID };
        const file = await Transport.fetch(server, url, query);
        const buffer = Buffer.from(file.content, 'base64');

        taskLog.set('repo', repo.name);
        taskLog.set('commit', commitID);
        taskLog.set('type', type);
        taskLog.set('path', path);
        await taskLog.finish();
        return buffer;
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

function isCommitID(commitID) {
    return /^[a-f0-9]{40}$/.test(commitID);
}

export {
    retrieveFile,
};
