import _ from 'lodash';
import Moment from 'moment';
import * as TaskLog from '../task-log.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as Transport from './transport.mjs';
import * as IssueImporter from './issue-importer.mjs';
import * as MergeRequestImporter from './merge-request-importer.mjs';
import * as MilestoneImporter from './milestone-importer.mjs';
import * as BranchImporter from './branch-importer.mjs';
import * as PushImporter from './push-importer.mjs';
import * as RepoImporter from './repo-importer.mjs';
import * as UserImporter from './user-importer.mjs';
import * as WikiImporter from './wiki-importer.mjs';
import * as NoteImporter from './note-importer.mjs';

// accessors
import Story from '../accessors/story.mjs';

/**
 * Retrieve activity log entries from Gitlab server and turn them into stories
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glHookEvent
 *
 * @return {Promise<Boolean>}
 */
async function processNewEvents(db, system, server, repo, project, glHookEvent) {
    const lastTask = await TaskLog.last('gitlab-event-import', {
        server_id: server.id,
        repo_id: repo.id,
        project_id: project.id,
    });
    const lastEventTime = _.get(lastTask, 'details.last_event_time');
    const repoLink = ExternalDataUtils.findLink(repo, server);
    const url = `/projects/${repoLink.project.id}/events`;
    const params = { sort: 'asc' };
    if (lastEventTime) {
        // the GitLab API's 'after' param only supports a date for some reason
        // need to start one day back to ensure all events are fetched
        const dayBefore = Moment(lastEventTime).subtract(1, 'day');
        params.after = dayBefore.format('YYYY-MM-DD');
    }
    const taskLog = TaskLog.start('gitlab-event-import', {
        saving: true,
        server_id: server.id,
        server: server.name,
        repo_id: repo.id,
        repo: repo.name,
        project_id: project.id,
        project: project.name,
    });
    const now = Moment();
    let firstEventAge;
    let processedEventCount = 0;
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
            const result = await processEvent(db, system, server, repo, project, glEvent, glHookEvent);
            taskLog.append(result ? 'added' : 'ignored', glEvent.action_name);
            taskLog.set('last_event_time', ctime);
            taskLog.report(nom, denom);
            if (result) {
                processedEventCount++;
            }
        });
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
    }
    return (processedEventCount > 0);
}

/**
 * Process an activity log entry, creating a story or updating an existing one
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glEvent
 * @param  {Object} glHookEvent
 *
 * @return {Promise<Boolean>}
 */
async function processEvent(db, system, server, repo, project, glEvent, glHookEvent) {
    try {
        const importer = getEventImporter(glEvent);
        if (!importer) {
            return false;
        }
        const author = await UserImporter.importUser(db, server, glEvent.author);
        if (!author) {
            return false;
        }
        return importer.processEvent(db, system, server, repo, project, author, glEvent, glHookEvent);
    } catch (err) {
        if (err.statusCode === 404) {
            console.error(err)
        } else {
            throw err;
        }
    }
}

/**
 * Process a hook event, updating a story usually--a story is created here only
 * if the event wouldn't have an entry in the activity log
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glHookEvent
 *
 * @return {Promise}
 */
async function processHookEvent(db, system, server, repo, project, glHookEvent) {
    const importer = getHookEventImporter(glHookEvent);
    if (!importer) {
        return false;
    }
    try {
        const author = await UserImporter.importUser(db, server, glHookEvent.user);
        if (!author) {
            return false;
        }
        return importer.processHookEvent(db, system, server, repo, project, author, glHookEvent);
    } catch (err) {
        if (err.statusCode === 404) {
            console.error(err)
        } else {
            throw err;
        }
    }
}

/**
 * Return an importer capable of importing the event
 *
 * @param  {Object} glEvent
 *
 * @return {Object}
 */
function getEventImporter(glEvent) {
    const targetType = normalizeToken(glEvent.target_type);
    switch (targetType) {
        case 'issue': return IssueImporter;
        case 'milestone': return MilestoneImporter;
        case 'merge_request':
        case 'mergerequest': return MergeRequestImporter;
        case 'note': return NoteImporter;
    }

    const actionName = normalizeToken(glEvent.action_name);
    switch (actionName) {
        case 'created':
        case 'imported': return RepoImporter;
        case 'deleted':
            if (glEvent.push_data || glEvent.data) {
                return BranchImporter;
            } else {
                return RepoImporter;
            }
        case 'joined':
        case 'left': return UserImporter;
        case 'pushed_new':
        case 'pushed_to': return PushImporter;
    }
    if (process.env.NODE_ENV !== 'production') {
        console.log(`Unknown event: target_type = ${targetType}, action_name = ${actionName}`);
        console.log(glEvent);
        console.log('******************************************************')
    }
}

/**
 * Return an importer capable of importing the hook event
 *
 * @param  {Object} glEvent
 *
 * @return {Object}
 */
function getHookEventImporter(glHookEvent) {
    const objectKind = normalizeToken(glHookEvent.object_kind);
    switch (objectKind) {
        case 'wiki_page': return WikiImporter;
        case 'issue': return IssueImporter;
        case 'mergerequest':
        case 'merge_request': return MergeRequestImporter;
    }
}

function normalizeToken(s) {
    s = _.toLower(s);
    s = _.replace(s, /[\s\-]/g, '_');
    return s;
}

export {
    processNewEvents,
    processHookEvent,
};
