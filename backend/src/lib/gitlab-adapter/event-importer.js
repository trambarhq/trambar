import _ from 'lodash';
import Moment from 'moment';
import * as TaskLog from 'task-log';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

import * as Transport from 'gitlab-adapter/transport';
import * as IssueImporter from 'gitlab-adapter/issue-importer';
import * as MergeRequestImporter from 'gitlab-adapter/merge-request-importer';
import * as MilestoneImporter from 'gitlab-adapter/milestone-importer';
import * as BranchImporter from 'gitlab-adapter/branch-importer';
import * as PushImporter from 'gitlab-adapter/push-importer';
import * as RepoImporter from 'gitlab-adapter/repo-importer';
import * as UserImporter from 'gitlab-adapter/user-importer';
import * as WikiImporter from 'gitlab-adapter/wiki-importer';
import * as NoteImporter from 'gitlab-adapter/note-importer';

// accessors
import Story from 'accessors/story';

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
 * @return {Promise}
 */
async function importEvents(db, system, server, repo, project, glHookEvent) {
    let options = {
        server_id: server.id,
        repo_id: repo.id,
        project_id: project.id,
    };
    let lastTask = await TaskLog.last('gitlab-event-import', options);
    let lastEventTime = _.get(lastTask, 'details.last_event_time');
    let repoLink = ExternalDataUtils.findLink(repo, server);
    let url = `/projects/${repoLink.project.id}/events`;
    let params = { sort: 'asc' };
    if (lastEventTime) {
        // after only supports a date for some reason
        // need to start one day back to ensure all events are fetched
        let dayBefore = Moment(lastEventTime).subtract(1, 'day');
        params.after = dayBefore.format('YYYY-MM-DD');
    }
    let taskLog = TaskLog.start('gitlab-event-import', {
        server_id: server.id,
        server: server.name,
        repo_id: repo.id,
        repo: repo.name,
        project_id: project.id,
        project: project.name,
    });
    let added = [];
    let firstEventAge;
    let now = Moment();
    try {
        await Transport.fetchEach(server, url, params, async (glEvent, index, total) => {
            let ctime = glEvent.created_at;
            if (lastEventTime) {
                if (ctime <= lastEventTime) {
                    return;
                }
            }
            let story = await importEvent(db, system, server, repo, project, glEvent, glHookEvent);
            if (story) {
                added.push(glEvent.action_name);
            }
            let nom = index + 1;
            let denom = total;
            if (!total) {
                // when the number of events is not yet known, use the event
                // time to calculate progress
                let eventAge = now.diff(ctime);
                if (firstEventAge === undefined) {
                    firstEventAge = eventAge;
                }
                nom = (firstEventAge - eventAge);
                denom = firstEventAge;
            }
            taskLog.report(nom, denom, { added, last_event_time: ctime });
        });
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
    }
}

/**
 * Import an activity log entry, creating a story or updating an existing one
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glEvent
 * @param  {Object} glHookEvent
 *
 * @return {Promise<Story|null>}
 */
async function importEvent(db, system, server, repo, project, glEvent, glHookEvent) {
    try {
        let importer = getEventImporter(glEvent);
        if (!importer) {
            return null;
        }
        let author = await UserImporter.findUser(db, server, glEvent.author);
        if (!author) {
            return null;
        }
        return importer.importEvent(db, system, server, repo, project, author, glEvent, glHookEvent);
    } catch (err) {
        console.error(err);
    }
}

/**
 * Import a hook event, updating a story usually--a story is created here only
 * if the event wouldn't have an entry in the activity log
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glHookEvent
 *
 * @return {Promise<Story|false|null>}
 */
async function importHookEvent(db, system, server, repo, project, glHookEvent) {
    try {
        let importer = getHookEventImporter(glHookEvent);
        if (!importer) {
            // not handled
            return false;
        }
        let author = await UserImporter.findUser(db, server, glHookEvent.user);
        if (!author) {
            return null;
        }
        return importer.importHookEvent(db, system, server, repo, project, author, glHookEvent);
    } catch (err) {
        console.error(err);
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
    let targetType = normalizeToken(glEvent.target_type);
    switch (targetType) {
        case 'issue': return IssueImporter;
        case 'milestone': return MilestoneImporter;
        case 'merge_request':
        case 'mergerequest': return MergeRequestImporter;
        case 'note': return NoteImporter;
    }

    let actionName = normalizeToken(glEvent.action_name);
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
    console.warn(`Unknown event: target_type = ${targetType}, action_name = ${actionName}`);
    console.log(glEvent);
    console.log('*****************************************')
}

/**
 * Return an importer capable of importing the hook event
 *
 * @param  {Object} glEvent
 *
 * @return {Object}
 */
function getHookEventImporter(glHookEvent) {
    let objectKind = normalizeToken(glHookEvent.object_kind);
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
    importEvents,
    importHookEvent,
};
