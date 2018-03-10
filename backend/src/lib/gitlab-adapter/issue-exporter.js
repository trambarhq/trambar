var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TaskLog = require('task-log');
var MarkdownExporter = require('utils/markdown-exporter');
var ExternalObjectUtils = require('objects/utils/external-object-utils');

var Transport = require('gitlab-adapter/transport');

// accessors
var Reaction = require('accessors/reaction');
var Story = require('accessors/story');
var Server = require('accessors/server');
var System = require('accessors/system');
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
    var criteria = { deleted: false };
    return System.findOne(db, 'global', criteria, '*').then((system) => {
        var issueLink = ExternalObjectUtils.findLinkByServerType(story, 'gitlab');
        if (!issueLink) {
            return null;
        }
        var glProjectId = _.get(issueLink, 'project.id');
        var glIssueNumber = _.get(issueLink, 'issue.number');
        var glUserId = _.get(issueLink, 'user.id');
        var newIssue = !glIssueNumber;
        var criteria = { id: issueLink.server_id, deleted: false };
        return Server.findOne(db, 'global', criteria, '*').then((server) => {
            if (!server) {
                throw new Error('Server not found');
            }
            var criteria = {
                external_object: ExternalObjectUtils.createLink(server, {
                    user: { id: glUserId }
                }),
                deleted: false,
            };
            return User.findOne(db, 'global', criteria, '*').then((user) => {
                if (!user) {
                    throw new Error('User not found');
                }
                return fetchIssue(server, glProjectId, glIssueNumber).then((glIssue) => {
                    var glIssueAfter = copyIssueProperties(glIssue, server, system, project, story);
                    if (_.isEqual(glIssueAfter, glIssue)) {
                        return null;
                    }
                    return saveIssue(server, glProjectId, glIssueNumber, glIssueAfter, glUserId).then((glIssue) => {
                        var storyAfter = _.cloneDeep(story);
                        var issueLinkAfter = ExternalObjectUtils.findLink(storyAfter, server);
                        _.set(issueLinkAfter, 'issue.id', glIssue.id);
                        _.set(issueLinkAfter, 'issue.number', glIssue.iid);
                        _.set(storyAfter, 'type', 'issue');
                        _.set(storyAfter, 'details.exported', true);
                        if (_.isEqual(story, storyAfter)) {
                            return story;
                        }
                        var schema = project.name;
                        return Story.updateOne(db, schema, storyAfter).then((story) => {
                            if (!newIssue) {
                                return story;
                            }
                            var reaction = copyTrackingReactionProperties(null, server, project, story, user);
                            return Reaction.insertOne(db, schema, reaction).then((reaction) => {
                                return story;
                            });
                        });
                    });
                });
            });
        }).catch((err) => {
            console.error(err);
            return null;
        });
    });
}

/**
 * Create a Gitlab issue object from information in story
 *
 * @param  {Object} glIssue
 * @param  {Story} story
 * @param  {Project} project
 * @param  {System} system
 *
 * @return {Object}
 */
function copyIssueProperties(glIssue, server, system, project, story) {
    var markdown = story.details.markdown;
    var textVersions = _.filter(story.details.text);
    var text = _.join(textVersions, '\n\n');
    if (!markdown) {
        text = MarkdownExporter.escape(text);
    }
    var address = _.get(system, 'settings.address');
    var resources = story.details.resources;
    var contents = MarkdownExporter.attachResources(text, resources, address);

    var glIssueAfter = _.clone(glIssue) || {};
    ExternalObjectUtils.exportProperty(story, server, 'title', glIssueAfter, {
        value: story.details.title,
        overwrite: 'match-previous',
    });
    ExternalObjectUtils.exportProperty(story, server, 'description', glIssueAfter, {
        value: contents,
        overwrite: 'match-previous',
    });
    ExternalObjectUtils.exportProperty(story, server, 'confidential', glIssueAfter, {
        value: !story.public,
        overwrite: 'match-previous',
    });
    ExternalObjectUtils.exportProperty(story, server, 'labels', glIssueAfter, {
        value: story.details.labels,
        overwrite: 'match-previous',
    });
    return glIssueAfter;
}

/**
 * Copy properties of tracking reaction
 *
 * @param  {Reaction} reaction
 * @param  {Server} server
 * @param  {Project} project
 * @param  {Story} story
 * @param  {User} user
 *
 * @return {Reaction}
 */
function copyTrackingReactionProperties(reaction, server, project, story, user) {
    debugger;
    var reactionAfter = _.clone(reaction) || {};
    ExternalObjectUtils.inheritLink(reactionAfter, server, story);
    ExternalObjectUtils.importProperty(reactionAfter, server, 'type', {
        value: 'tracking',
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'story_id', {
        value: story.id,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'user_id', {
        value: user.id,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'public', {
        value: story.public,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'ptime', {
        value: Moment().toISOString(),
        overwrite: 'always',
    });
    return reactionAfter;
}

/**
 * Retrieve issue from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glIssueNumber
 *
 * @return {Object}
 */
function fetchIssue(server, glProjectId, glIssueNumber) {
    if (!glIssueNumber) {
        return Promise.resolve(null);
    }
    var url = `/projects/${glProjectId}/issues/${glIssueNumber}`;
    return Transport.fetch(server, url);
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
    var props = {
        title: glIssue.title,
        description: glIssue.description,
        state: glIssue.state,
        labels: _.join(glIssue.labels, ','),
        confidential: glIssue.confidential,
    };
    if (glIssueNumber) {
        url += `/${glIssueNumber}`;
        return Transport.put(server, url, props, glUserId);
    } else {
        return Transport.post(server, url, props, glUserId);
    }
}
