var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TaskLog = require('task-log');
var ExternalDataUtils = require('objects/utils/external-data-utils');

var Transport = require('gitlab-adapter/transport');
var IssueImporter = require('gitlab-adapter/issue-importer');
var MergeRequestImporter = require('gitlab-adapter/merge-request-importer');
var MilestoneImporter = require('gitlab-adapter/milestone-importer');
var BranchImporter = require('gitlab-adapter/branch-importer');
var PushImporter = require('gitlab-adapter/push-importer');
var RepoImporter = require('gitlab-adapter/repo-importer');
var UserImporter = require('gitlab-adapter/user-importer');
var WikiImporter = require('gitlab-adapter/wiki-importer');
var NoteImporter = require('gitlab-adapter/note-importer');

// accessors
var Story = require('accessors/story');

module.exports = {
    importEvents,
    importHookEvent,
};

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
function importEvents(db, system, server, repo, project, glHookEvent) {
    var options = {
        server_id: server.id,
        repo_id: repo.id,
        project_id: project.id,
    };
    return TaskLog.last('gitlab-event-import', options).then((lastTask) => {
        var lastEventTime = _.get(lastTask, 'details.last_event_time');
        var repoLink = ExternalDataUtils.findLink(repo, server);
        var url = `/projects/${repoLink.project.id}/events`;
        var params = { sort: 'asc' };
        if (lastEventTime) {
            // after only supports a date for some reason
            // need to start one day back to ensure all events are fetched
            var dayBefore = Moment(lastEventTime).subtract(1, 'day');
            params.after = dayBefore.format('YYYY-MM-DD');
        }
        var taskLog = TaskLog.start('gitlab-event-import', {
            server_id: server.id,
            server: server.name,
            repo_id: repo.id,
            repo: repo.name,
            project_id: project.id,
            project: project.name,
        });
        var added = [];
        var firstEventAge;
        var now = Moment();
        return Transport.fetchEach(server, url, params, (glEvent, index, total) => {
            var ctime = glEvent.created_at;
            if (lastEventTime) {
                if (ctime <= lastEventTime) {
                    return;
                }
            }
            return importEvent(db, system, server, repo, project, glEvent, glHookEvent).then((story) => {
                if (story) {
                    added.push(glEvent.action_name);
                }
            }).tap(() => {
                var nom = index + 1;
                var denom = total;
                if (!total) {
                    // when the number of events is not yet known, use the event
                    // time to calculate progress
                    var eventAge = now.diff(ctime);
                    if (firstEventAge === undefined) {
                        firstEventAge = eventAge;
                    }
                    nom = (firstEventAge - eventAge);
                    denom = firstEventAge;
                }
                taskLog.report(nom, denom, { added, last_event_time: ctime });
            }).catch((err) => {
            });
        }).tap(() => {
            taskLog.finish();
        }).tapCatch((err) => {
            console.error(err.message);
            taskLog.abort(err);
        });
    });
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
function importEvent(db, system, server, repo, project, glEvent, glHookEvent) {
    var importer = getEventImporter(glEvent);
    if (!importer) {
        return Promise.resolve(null);
    }
    return UserImporter.findUser(db, server, glEvent.author).then((author) => {
        if (!author) {
            return null;
        }
        return importer.importEvent(db, system, server, repo, project, author, glEvent, glHookEvent);
    });
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
function importHookEvent(db, system, server, repo, project, glHookEvent) {
    var importer = getHookEventImporter(glHookEvent);
    if (!importer) {
        // not handled
        return Promise.resolve(false);
    }
    return UserImporter.findUser(db, server, glHookEvent.user).then((author) => {
        if (!author) {
            return null;
        }
        return importer.importHookEvent(db, system, server, repo, project, author, glHookEvent);
    });
}

/**
 * Return an importer capable of importing the event
 *
 * @param  {Object} glEvent
 *
 * @return {Object}
 */
function getEventImporter(glEvent) {
    var targetType = normalizeToken(glEvent.target_type);
    switch (targetType) {
        case 'issue': return IssueImporter;
        case 'milestone': return MilestoneImporter;
        case 'merge_request':
        case 'mergerequest': return MergeRequestImporter;
        case 'note': return NoteImporter;
    }

    var actionName = normalizeToken(glEvent.action_name);
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
    var objectKind = normalizeToken(glHookEvent.object_kind);
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
