var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

var Transport = require('gitlab-adapter/transport');
var Export = require('gitlab-adapter/export');
var Import = require('gitlab-adapter/import');
var UserExporter = require('gitlab-adapter/user-exporter');

// accessors
var Story = require('accessors/story');
var Server = require('accessors/server');
var User = require('accessors/user');

exports.exportStory = exportStory;

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
    var link = Import.Link.find(story);
    var criteria = { id: link.server_id, deleted: false };
    return Server.findOne(db, 'global', criteria, '*').then((server) => {
        var criteria = { id: story.user_ids[0], deleted: false };
        return User.findOne(db, 'global', criteria, '*').then((author) => {
            if (!server || !author) {
                return null;
            }
            var authorLink = Import.Link.find(author, server);
            var glIssue = copyIssueProperties(story, project, link);
            var glIssueNumber = story.details.number;
            return saveIssue(server, link.project.id, glIssueNumber, glIssue, authorLink.user.id).then((glIssue) => {
                var storyAfter = _.cloneDeep(story);
                var linkAfter = Import.Link.find(storyAfter);
                _.set(linkAfter, 'issue.id', glIssue.id);
                _.set(storyAfter, 'details.number', glIssue.iid);
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
    _.set(glIssue, 'assignee_ids', []);
    _.set(glIssue, 'labels', story.details.labels);
    _.set(glIssue, 'weight', story.details.weight);
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
    }
    return Transport.post(server, url, glIssue);
}
