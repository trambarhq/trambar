var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

var Transport = require('gitlab-adapter/transport');
var Import = require('gitlab-adapter/import');
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
    return findLastEventTime(db, project, server, repo).then((lastEventTime) => {
        var link = _.find(repo.external, { type: 'gitlab' });
        var url = `/projects/${link.project.id}/events`;
        var params = { sort: 'asc' };
        if (lastEventTime) {
            // after only supports a date for some reason
            // need to start one day back to ensure all events are fetched
            var dayBefore = lastEventTime.clone().subtract(1, 'day');
            params.after = dayBefore.format('YYYY-MM-DD');
        }
        var firstEventAge;
        var now = Moment();
        return Transport.fetchEach(server, url, params, (glEvent, index, total) => {
            var eventTime = Moment(glEvent.created_at);
            if (lastEventTime) {
                if (eventTime < lastEventTime) {
                    return;
                }
            }
            var progress;
            if (total) {
                // when the number of events is known, calculate progress using that
                progress = index / total;
            } else {
                // otherwise, use the event time to calculate progress
                var eventAge = now.diff(eventTime);
                if (firstEventAge === undefined) {
                    firstEventAge = eventAge;
                }
                progress = (firstEventAge - eventAge) / firstEventAge;
            }
            var percent = Math.round(progress * 100);
            console.log(`Importing event "${glEvent.action_name}" [${percent}%]`);
            return importEvent(db, server, repo, project, glEvent);
        });
    }).then(() => {
        console.log('Finished importing events')
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

/**
 * Return publication time of the most recent story from repository
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {Server} server
 * @param  {Repo} repo
 *
 * @return {Promise<Moment>}
 */
function findLastEventTime(db, project, server, repo) {
    var schema = project.name;
    var repoLink = _.find(repo.external, {
        type: 'gitlab',
        server_id: server.id,
    });
    var criteria = {
        external_object: repoLink,
        published: true,
    };
    return Story.findOne(db, schema, criteria, 'MAX(ptime) AS time').then((row) => {
        return (row && row.time) ? Moment(row.time) : null;
    });
}
