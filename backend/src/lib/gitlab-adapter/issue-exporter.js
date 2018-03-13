var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TaskLog = require('task-log');
var MarkdownExporter = require('utils/markdown-exporter');
var ExternalDataUtils = require('objects/utils/external-data-utils');

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
        var issueLink = ExternalDataUtils.findLinkByServerType(story, 'gitlab');
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
                external_object: ExternalDataUtils.createLink(server, {
                    user: { id: glUserId }
                }),
                deleted: false,
            };
            return User.findOne(db, 'global', criteria, '*').then((user) => {
                if (!user) {
                    throw new Error('User not found');
                }
                return fetchIssue(server, glProjectId, glIssueNumber).then((glIssue) => {
                    var glIssueAfter = exportIssueProperties(glIssue, server, system, project, story);
                    if (glIssueAfter === glIssue) {
                        return null;
                    }
                    return saveIssue(server, glProjectId, glIssueNumber, glIssueAfter, glUserId).then((glIssue) => {
                        var schema = project.name;
                        var storyAfter = copyIssueProperties(story, server, glIssue);
                        return Story.updateOne(db, schema, storyAfter).then((story) => {
                            if (!newIssue) {
                                return story;
                            }
                            var reactionNew = copyTrackingReactionProperties(null, server, project, story, user);
                            return Reaction.insertOne(db, schema, reactionNew).then((reaction) => {
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
 * Copy information in a story into a Gitlab issue object
 *
 * @param  {Object} glIssue
 * @param  {Story} story
 * @param  {Project} project
 * @param  {System} system
 *
 * @return {Object}
 */
function exportIssueProperties(glIssue, server, system, project, story) {
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
    ExternalDataUtils.exportProperty(story, server, 'title', glIssueAfter, {
        value: story.details.title,
        overwrite: 'match-previous',
    });
    ExternalDataUtils.exportProperty(story, server, 'description', glIssueAfter, {
        value: contents,
        overwrite: 'match-previous',
    });
    ExternalDataUtils.exportProperty(story, server, 'confidential', glIssueAfter, {
        value: !story.public,
        overwrite: 'match-previous',
    });
    ExternalDataUtils.exportProperty(story, server, 'labels', glIssueAfter, {
        value: story.details.labels,
        overwrite: 'match-previous',
    });
    if (_.isEqual(glIssueAfter, glIssue)) {
        return glIssue;
    }
    return glIssueAfter;
}

/**
 * Add issue properties to exported story
 *
 * @param  {Story} story
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} glIssue
 *
 * @return {Story}
 */
function copyIssueProperties(story, server, glIssue) {
    var storyAfter = _.cloneDeep(story);
    var issueLink = ExternalDataUtils.findLink(storyAfter, server);
    issueLink.issue.id = glIssue.id;
    issueLink.issue.number = glIssue.iid;
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: 'issue',
        overwrite: 'always'
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.exported', {
        value: true,
        overwrite: 'always'
    });
    storyAfter.etime = new String('NOW()');
    return storyAfter;
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
    var reactionAfter = _.clone(reaction) || {};
    ExternalDataUtils.inheritLink(reactionAfter, server, story);
    ExternalDataUtils.importProperty(reactionAfter, server, 'type', {
        value: 'tracking',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'story_id', {
        value: story.id,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'user_id', {
        value: user.id,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'public', {
        value: story.public,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'ptime', {
        value: Moment().toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(reactionAfter, reaction)) {
        return reaction;
    }
    reactionAfter.itime = new String('NOW()');
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
