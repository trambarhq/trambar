var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

var Transport = require('gitlab-adapter/transport');
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
 * @param  {Story} story
 *
 * @return {Promise<Story|null>}
 */
function exportStory(db, story) {
    var storyLink = Import.Link.find(story);
    var criteria = { id: storyLink.server_id, deleted: false };
    return Server.findOne(db, 'global', criteria, '*').then((server) => {
        var criteria = { id: story.user_ids, deleted: false };
        return User.find(db, 'global' criteria, '*').then((users) => {
            if (!server || !user) {
                return null;
            }
            var glIssue = extractIssueProperties(story);
        });
    });
}

function extractIssueProperties(story) {
    var glIssue = {};

    return glIssue;
}

/**
 * Create or update an issue at Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glIssue
 * @param  {Number} glUserId
 *
 * @return {Promise}
 */
function saveIssue(server, glProjectId, glIssue, glUserId) {
    var url = `/projects/${glProjectId}/issues`;
    if (glIssue.id) {
        url += `/${glIssue.id}`;
    }
    return Transport.post(server, url, glIssue, userId);
}
