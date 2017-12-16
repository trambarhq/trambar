var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var LinkUtils = require('objects/utils/link-utils');

var Export = require('external-services/export');
var Import = require('external-services/import');
var TaskLog = require('external-services/task-log');
var Transport = require('gitlab-adapter/transport');
var UserExporter = require('gitlab-adapter/user-exporter');

// accessors
var Story = require('accessors/story');
var Server = require('accessors/server');
var User = require('accessors/user');

module.exports = {
    exportStory,
};

/**
 * Export a story to issue tracker
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {Story} story
 *
 * @return {Promise<Story|null>}
 */
function exportStory(db, project, story) {
    var issueLink = LinkUtils.find(story, { type: 'gitlab', relation: 'issue' });
    var criteria = { id: issueLink.server_id, deleted: false };
    return Server.findOne(db, 'global', criteria, '*').then((server) => {
        var criteria = { id: story.user_ids[0], deleted: false };
        return User.findOne(db, 'global', criteria, '*').then((author) => {
            if (!server || !author) {
                return null;
            }
            var authorLink = LinkUtils.find(author, { server });
            var glIssue = copyIssueProperties(story, project, issueLink);
            var glIssueNumber = issueLink.issue.number;
            return saveIssue(server, issueLink.project.id, glIssueNumber, glIssue, authorLink.user.id).then((glIssue) => {
                var storyAfter = _.cloneDeep(story);
                var issueLinkAfter = LinkUtils.find(storyAfter, { type: 'gitlab', relation: 'issue' });
                _.set(issueLinkAfter, 'issue.id', glIssue.id);
                _.set(issueLinkAfter, 'issue.number', glIssue.iid);
                if (_.isEqual(story, storyAfter)) {
                    return story;
                }
                return Story.updateOne(db, project.name, storyAfter);
            });
        });
    });
}

/**
 * Create a Gitlab issue object from information in story
 *
 * @param  {Story} story
 * @param  {Project} project
 * @param  {Object} link
 *
 * @return {Object}
 */
function copyIssueProperties(story, project, link) {
    var glIssue = {};
    var lang = link.default_lang;
    var resources = story.details.resources;
    var markdown = story.details.markdown;
    var text = Export.text(story.details.text, lang);
    var contents = Export.format(text, markdown, resources);
    var title = Export.text(story.details.title, lang);
    _.set(glIssue, 'title', title || 'Untitled');
    _.set(glIssue, 'description', contents);
    _.set(glIssue, 'confidential', !story.public);
    _.set(glIssue, 'labels', _.join(story.details.labels, ','));
    return glIssue;
}

/**
 * Create or update an issue at Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glIssueNumber
 * @param  {Object} glIssue
 * @param  {Number} glUserId
 *
 * @return {Promise}
 */
function saveIssue(server, glProjectId, glIssueNumber, glIssue, glUserId) {
    var url = `/projects/${glProjectId}/issues`;
    if (glIssueNumber) {
        url += `/${glIssueNumber}`;
        return Transport.put(server, url, glIssue, glUserId);
    } else {
        return Transport.post(server, url, glIssue, glUserId);
    }
}
