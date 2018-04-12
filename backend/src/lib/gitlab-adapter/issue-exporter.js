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
 * @param  {System} system
 * @param  {Project} project
 * @param  {Story} story
 *
 * @return {Promise<Story|null>}
 */
function exportStory(db, system, project, story) {
    var issueLink = _.find(story.external, (link) => {
        if (link.type === 'gitlab' && link.issue) {
            if (!link.issue.deleted) {
                return true;
            }
        }
    });
    var prevIssueLink = _.find(story.external, (link) => {
        if (link.type === 'gitlab' && link.issue) {
            if (link.issue.deleted) {
                return true;
            }
        }
    });
    if (issueLink && prevIssueLink) {
        return exportStoryMove(db, system, project, story, prevIssueLink, issueLink);
    } else if (issueLink) {
        return exportStoryCreate(db, system, project, story, issueLink);
    } else if (prevIssueLink) {
        return exportStoryRemove(db, system, project, story, prevIssueLink)
    } else {
        // the story isn't being exported to a GitLab issue-tracker
        return Promise.resolve(null);
    }
}

/**
 * Create or modify an issue
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Project} project
 * @param  {Story} story
 * @param  {Object} issueLink
 *
 * @return {Promise<Story|null>}
 */
function exportStoryCreate(db, system, project, story, issueLink) {
    var glProjectId = _.get(issueLink, 'project.id');
    var glIssueNumber = _.get(issueLink, 'issue.number');
    var glUserId = _.get(issueLink, 'user.id');
    var newIssue = !glIssueNumber;
    return findTargetServer(db, issueLink).then((server) => {
        return findActingUser(db, server, glUserId).then((user) => {
            return fetchIssue(server, glProjectId, glIssueNumber).then((glIssue) => {
                var glIssueAfter = exportIssueProperties(glIssue, server, system, project, story);
                if (glIssueAfter === glIssue) {
                    return null;
                }
                return saveIssue(server, glProjectId, glIssueNumber, glIssueAfter, glUserId).then((glIssue) => {
                    var schema = project.name;
                    var storyAfter = copyIssueProperties(story, server, user, issueLink, glIssue);
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
    });
}

/**
 * Delete an exported issue
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Project} project
 * @param  {Story} story
 * @param  {Object} issueLink
 *
 * @return {Promise<Story|null>}
 */
function exportStoryRemove(db, system, project, story, issueLink) {
    var glProjectId = _.get(issueLink, 'project.id');
    var glIssueNumber = _.get(issueLink, 'issue.number');
    var glUserId = _.get(issueLink, 'user.id');
    return findTargetServer(db, issueLink).then((server) => {
        return removeIssue(server, glProjectId, glIssueNumber, glUserId).then(() => {
            var schema = project.name;
            var storyAfter = deleteIssueProperties(story, issueLink);
            return Story.updateOne(db, schema, storyAfter).then((story) => {
                // remove tracking, note, and assignment reactions
                var criteria = {
                    story_id: story.id,
                    type: [ 'tracking', 'note', 'assignment' ],
                    deleted: false,
                };
                return Reaction.find(db, schema, criteria, 'id').then((reactions) => {
                    var reactionsAfter = _.map(reactions, (reaction) => {
                        return { id: reaction.id, deleted: true };
                    });
                    return Reaction.save(db, schema, reactionsAfter);
                }).then((reactions) => {
                    return story;
                });
            });
        });
    }).catch((err) => {
        console.error(err);
        return null;
    });
}

/**
 * Move an exported issue
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Project} project
 * @param  {Story} story
 * @param  {Object} issueLink
 *
 * @return {Promise<Story|null>}
 */
function exportStoryMove(db, system, project, story, srcIssueLink, dstIssueLink) {
    if (srcIssueLink.server_id !== dstIssueLink.server_id) {
        return exportStoryRemove(db, project, story, srcIssueLink).then((story) => {
            return exportStoryCreate(db, system, project, story, dstIssueLink);
        });
    } else {
        var glSrcProjectId = _.get(srcIssueLink, 'project.id');
        var glSrcIssueNumber = _.get(srcIssueLink, 'issue.number');
        var glDstProjectId = _.get(dstIssueLink, 'project.id');
        var glUserId = _.get(dstIssueLink, 'user.id');
        return findTargetServer(db, srcIssueLink).then((server) => {
            return findActingUser(db, server, glUserId).then((user) => {
                return moveIssue(server, glSrcProjectId, glSrcIssueNumber, glDstProjectId, glUserId).then((glIssue) => {
                    var schema = project.name;
                    var storyAfter = adjustIssueProperties(story, server, user, srcIssueLink, dstIssueLink, glIssue);
                    return Story.updateOne(db, schema, storyAfter).then((story) => {
                        // update tracking, note, and assignment reactions
                        var criteria = {
                            story_id: story.id,
                            type: [ 'tracking', 'note', 'assignment' ],
                            deleted: false,
                        };
                        return Reaction.find(db, schema, criteria, 'id, type, user_id, external').then((reactions) => {
                            var reactionsAfter = _.map(reactions, (reaction) => {
                                return adjustTrackingReactionProperties(reaction, server, srcIssueLink, dstIssueLink, glIssue);
                            });
                            // if the different user is moving the issue, add
                            // a tracking reaction for him as well
                            if (!_.some(reactionsAfter, { type: 'tracking', user_id: user.id })) {
                                var reactionNew = copyTrackingReactionProperties(null, server, project, story, user);
                                reactionsAfter.push(reactionNew);
                            }
                            return Reaction.save(db, schema, reactionsAfter);
                        }).then((reactions) => {
                            return story;
                        });

                    });
                });
            });
        }).catch((err) => {
            console.error(err);
            return null;
        });
    }
}

/**
 * Find the server that the link refers to
 *
 * @param  {Database} db
 * @param  {Object} issueLink
 *
 * @return {Promise<Server>}
 */
function findTargetServer(db, issueLink) {
    var criteria = { id: issueLink.server_id, deleted: false };
    return Server.findOne(db, 'global', criteria, '*').then((server) => {
        if (!server) {
            throw new Error('Server not found');
        }
        return server;
    });
}

/**
 * Find the user who's performing the action
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Number} glUserId
 *
 * @return {Promise<User>}
 */
function findActingUser(db, server, glUserId) {
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
        return user;
    });
}

/**
 * Copy information in a story into a Gitlab issue object
 *
 * @param  {Object} glIssue
 * @param  {Server} server
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
        overwrite: 'match-previous:title',
    });
    ExternalDataUtils.exportProperty(story, server, 'description', glIssueAfter, {
        value: contents,
        overwrite: 'match-previous:description',
    });
    ExternalDataUtils.exportProperty(story, server, 'confidential', glIssueAfter, {
        value: !story.public,
        overwrite: 'match-previous:confidential',
    });
    ExternalDataUtils.exportProperty(story, server, 'labels', glIssueAfter, {
        value: story.details.labels,
        overwrite: 'match-previous:labels',
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
 * @param  {User} user
 * @param  {Object} issueLink
 * @param  {Object} glIssue
 *
 * @return {Story}
 */
function copyIssueProperties(story, server, user, issueLink, glIssue) {
    var storyAfter = _.cloneDeep(story);
    var issueLinkAfter = _.find(storyAfter.external, issueLink);

    var authorIds = _.get(story, 'details.authors', story.user_ids);
    var authorRoleIds = _.get(story, 'details.author_roles', story.role_ids);
    var exporterIds = _.get(story, 'details.exporters');
    var assigneeIds = _.get(story, 'details.assignees');
    var roleIds = _.get(story, 'role_ids');

    // add ids of exporter
    exporterIds = _.union(exporterIds, [ user.id ]);
    roleIds = _.union(roleIds, user.role_ids);

    issueLinkAfter.issue.id = glIssue.id;
    issueLinkAfter.issue.number = glIssue.iid;
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: 'issue',
        overwrite: 'always'
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'user_ids', {
        value: _.union(authorIds, exporterIds, assigneeIds),
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'role_ids', {
        value: roleIds,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.authors', {
        value: authorIds,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.author_roles', {
        value: authorRoleIds,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.exporters', {
        value: exporterIds,
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
 * Delete issue properties from a previously exported story
 *
 * @param  {Story} story
 * @param  {Object} issueLink
 *
 * @return {Story}
 */
function deleteIssueProperties(story, issueLink) {
    var storyAfter = _.cloneDeep(story);
    storyAfter.type = 'post';
    storyAfter.etime = null;
    if (storyAfter.details.authors) {
        storyAfter.user_ids = storyAfter.details.authors;
    }
    if (storyAfter.details.author_roles) {
        storyAfter.role_ids = storyAfter.details.author_roles;
    }
    delete storyAfter.details.authors;
    delete storyAfter.details.author_roles;
    delete storyAfter.details.exporters;
    delete storyAfter.details.assignees;
    delete storyAfter.details.exported;
    _.remove(storyAfter.external, issueLink);
    return storyAfter;
}

/**
 * Adjust issue properties after moving issue
 *
 * @param  {Story} story
 * @param  {Server} server
 * @param  {User} user
 * @param  {Object} srcIssueLink
 * @param  {Object} dstIssueLink
 * @param  {Object} glIssue
 *
 * @return {Story}
 */
function adjustIssueProperties(story, server, user, srcIssueLink, dstIssueLink, glIssue) {
    var storyAfter = copyIssueProperties(story, server, user, dstIssueLink, glIssue);
    _.remove(storyAfter.external, srcIssueLink);
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
 * Update a reaction object with new issue number and id
 *
 * @param  {Reaction} reaction
 * @param  {Server} server
 * @param  {Object} srcIssueLink
 * @param  {Object} dstIssueLink
 * @param  {Object} glIssue
 *
 * @return {Object}
 */
function adjustTrackingReactionProperties(reaction, server, srcIssueLink, dstIssueLink, glIssue) {
    var reactionAfter = _.cloneDeep(reaction);
    var issueLinkAfter = _.find(reactionAfter.external, (link) => {
        if (link.server_id === server.id) {
            if (link.issue.id === srcIssueLink.issue.id) {
                return true;
            }
        }
    });
    if (issueLinkAfter) {
        issueLinkAfter.issue.id = glIssue.id;
        issueLinkAfter.issue.number = glIssue.iid;
    }
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

/**
 * Delete issue at Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glIssueNumber
 * @param  {Number} glUserId
 *
 * @return {Object}
 */
function removeIssue(server, glProjectId, glIssueNumber, glUserId) {
    var url = `/projects/${glProjectId}/issues/${glIssueNumber}`;
    return Transport.remove(server, url, glUserId);
}

/**
 * Move an issue at Gitlab from one project to another
 *
 * @param  {Server} server
 * @param  {Number} glSrcProjectId
 * @param  {Number} glSrcIssueNumber
 * @param  {Number} glDstProjectId
 * @param  {Number} glUserId
 *
 * @return {Object}
 */
function moveIssue(server, glSrcProjectId, glSrcIssueNumber, glDstProjectId, glUserId) {
    var url = `/projects/${glSrcProjectId}/issues/${glSrcIssueNumber}/move`;
    var props = { to_project_id: glDstProjectId };
    return Transport.post(server, url, props, glUserId);
}
