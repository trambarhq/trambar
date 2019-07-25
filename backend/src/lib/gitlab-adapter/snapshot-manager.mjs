import _ from 'lodash';
import Moment from 'moment';
import Database from '../database.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as TaskLog from '../task-log.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import Project from '../accessors/project.mjs';
import Repo from '../accessors/repo.mjs';
import Server from '../accessors/server.mjs';
import Snapshot from '../accessors/snapshot.mjs';

import * as Transport from './transport.mjs';
import * as PushReconstructor from './push-reconstructor.mjs';
import * as UserImporter from './user-importer.mjs';

const availableFileTypes = [ 'www', 'ssr' ];
const availableFileTypesRE = new RegExp(`^(${availableFileTypes.join('|')})\\/`);

async function retrieveFile(schema, tag, type, path) {
    const taskLog = TaskLog.start('snapshot-retrieve', {
        project: schema,
        tag,
        type,
        path,
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
        await taskLog.finish();
        return buffer;
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

/**
 * Scan activity log entries to see if there're new snapshots
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 *
 * @return {Promise}
 */
async function processNewEvents(db, server, repo) {
    const lastTask = await TaskLog.last('gitlab-snapshot-import', {
        server_id: server.id,
        repo_id: repo.id,
    });
    const lastEventTime = _.get(lastTask, 'details.last_event_time');
    const repoLink = ExternalDataUtils.findLink(repo, server);
    const url = `/projects/${repoLink.project.id}/events`;
    const params = { sort: 'asc', action: 'pushed' };
    if (lastEventTime) {
        // the GitLab API's 'after' param only supports a date for some reason
        // need to start one day back to ensure all events are fetched
        const dayBefore = Moment(lastEventTime).subtract(1, 'day');
        params.after = dayBefore.format('YYYY-MM-DD');
    }
    const taskLog = TaskLog.start('gitlab-snapshot-import', {
        saving: true,
        server_id: server.id,
        server: server.name,
        repo_id: repo.id,
        repo: repo.name,
    });
    const now = Moment();
    const lastSnapshots = {};
    let firstEventAge;
    try {
        await Transport.fetchEach(server, url, params, async (glEvent, index, total) => {
            const ctime = glEvent.created_at;
            if (lastEventTime) {
                if (ctime <= lastEventTime) {
                    return;
                }
            }
            let nom = index + 1;
            let denom = total;
            if (!total) {
                // when the number of events is not yet known, use the event
                // time to calculate progress
                const eventAge = now.diff(ctime);
                if (firstEventAge === undefined) {
                    firstEventAge = eventAge;
                }
                nom = (firstEventAge - eventAge);
                denom = firstEventAge;
            }
            const actionName = _.snakeCase(glEvent.action_name);
            if (actionName === 'pushed_to' || actionName === 'pushed_new') {
                const author = await UserImporter.importUser(db, server, glEvent.author);
                if (author) {
                    const snapshot = await importSnapshot(db, server, repo, author, glEvent);
                    if (snapshot) {
                        lastSnapshots[snapshot.branch_name] = snapshot;
                        taskLog.append('commits', snapshot.commit_id);
                    }
                }
            }
            taskLog.set('last_event_time', ctime);
            taskLog.report(nom, denom);
        });

        for (let [ branch, snapshot ] of _.entries(lastSnapshots)) {
            // clear head flag of other snapshots
            const criteria = {
                exclude: [ snapshot.id ],
                branch_name: branch,
                deleted: false,
                head: true,
            };
            await Snapshot.updateMatching(db, 'global', criteria, { head: false });
        }
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
    }
}

async function importSnapshot(db, server, repo, author, glEvent) {
    let branch, headID, tailID, type, count;
    if (glEvent.push_data) {
        // version 10
        branch = glEvent.push_data.ref;
        type = glEvent.push_data.ref_type;
        headID = glEvent.push_data.commit_to;
        tailID = glEvent.push_data.commit_from;
        count = glEvent.push_data.commit_count;
    } else if (glEvent.data) {
        // version 9
        const refParts = _.split(glEvent.data.ref, '/');
        branch = _.last(refParts);
        type = /^tags$/.test(refParts[1]) ? 'tag' : 'branch';
        headID = glEvent.data.after;
        tailID = glEvent.data.before;
        if (/^0+$/.test(tailID)) {
            // all zeros
            tailID = null;
        }
        count = glEvent.data.total_commits_count;
    }
    const push = await PushReconstructor.reconstructPush(db, server, repo, type, branch, headID, tailID, count);
    if (containsTemplateFile(push)) {
        try {
            const snapshot = {
                user_id: author.id,
                repo_id: repo.id,
                branch_name: branch,
                commit_id: headID,
                head: true,
                ptime: Moment(glEvent.created_at).toISOString(),
            };
            const snapshotAfter = await Snapshot.insertOne(db, 'global', snapshot);
            return snapshotAfter;
        } catch (err) {
            if (err.code === '23505') {
                // unique constraint violation--ignore
            } else {
                throw err;
            }
        }
    }
}

function containsTemplateFile(push) {
    for (let files of _.values(push.files)) {
        for (let file of files) {
            if (availableFileTypesRE.test(file)) {
                return true;
            }
        }
    }
    return false;
}

function isCommitID(commitID) {
    return /^[a-f0-9]{40}$/.test(commitID);
}

export {
    retrieveFile,
    processNewEvents,
};
