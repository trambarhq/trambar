var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

var Import = require('external-services/import');
var TaskLog = require('external-services/task-log');
var Transport = require('gitlab-adapter/transport');
var IssueImporter = require('gitlab-adapter/issue-importer');
var MergeRequestImporter = require('gitlab-adapter/merge-request-importer');
var MilestoneImporter = require('gitlab-adapter/milestone-importer');
var PushImporter = require('gitlab-adapter/push-importer');
var RepoImporter = require('gitlab-adapter/repo-importer');
var UserImporter = require('gitlab-adapter/user-importer');

// accessors
var Story = require('accessors/story');

exports.importEvents = importEvents;

/**
 * Retrieve activity log entries from Gitlab server and turn them into stories
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importEvents(db, server, repo, project) {
    return TaskLog.last(server, 'gitlab-event-import').then((lastTask) => {
        var lastEventTime = _.get(lastTask, 'details.last_event_time');
        var repoLink = Import.Link.find(repo, server);
        var url = `/projects/${repoLink.project.id}/events`;
        var params = { sort: 'asc' };
        if (lastEventTime) {
            // after only supports a date for some reason
            // need to start one day back to ensure all events are fetched
            var dayBefore = Moment(lastEventTime).subtract(1, 'day');
            params.after = dayBefore.format('YYYY-MM-DD');
        }
        var taskLog = TaskLog.start(server, 'gitlab-event-import', {
            repo: repo.name,
        });
        var events = [];
        var firstEventAge;
        var now = Moment();
        return Transport.fetchEach(server, url, params, (glEvent, index, total) => {
            if (lastEventTime) {
                if (glEvent.created_at <= lastEventTime) {
                    return;
                }
            }
            var progress;
            if (total) {
                // when the number of events is known, calculate progress using that
                progress = (index + 1) / total;
            } else {
                // otherwise, use the event time to calculate progress
                var eventAge = now.diff(eventTime);
                if (firstEventAge === undefined) {
                    firstEventAge = eventAge;
                }
                progress = (firstEventAge - eventAge) / firstEventAge;
            }
            return importEvent(db, server, repo, project, glEvent).then((story) => {
                if (story) {
                    events.push(glEvent.action_name);
                }
                taskLog.report(Math.round(progress * 100), {
                    last_event_time: glEvent.created_at,
                    events,
                });
            });
        }).then(() => {
            taskLog.finish();
        }).catch((err) => {
            taskLog.abort(err);
        });
    });
}

/**
 * Import an activity log entry, creating a story or updating an existing one
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glEvent
 *
 * @return {Promise}
 */
function importEvent(db, server, repo, project, glEvent) {
    return UserImporter.importUser(db, server, glEvent.author).then((author) => {
        if (!author) {
            return;
        }
        var importer = getImporter(glEvent);
        if (!importer) {
            return null;
        }
        return importer.importEvent(db, server, repo, project, author, glEvent);
    });
}

/**
 * Return an importer capable of importing the event
 *
 * @param  {Object} glEvent
 *
 * @return {Object}
 */
function getImporter(glEvent) {
    switch (glEvent.target_type) {
        case 'Issue': return IssueImporter;
        case 'Milestone': return MilestoneImporter;
        case 'MergeRequest': return MergeRequestImporter;
    }

    switch (glEvent.action_name) {
        case 'deleted':
        case 'created':
        case 'imported': return RepoImporter;
        case 'joined':
        case 'left': return UserImporter;
        case 'pushed new':
        case 'pushed_new':
        case 'pushed new':
        case 'pushed_to':
        case 'pushed to': return PushImporter;
    }
}
