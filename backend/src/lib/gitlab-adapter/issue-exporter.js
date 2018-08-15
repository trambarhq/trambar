var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TaskLog = require('task-log');
var Localization = require('localization');
var HTTPError = require('errors/http-error');
var MarkdownExporter = require('utils/markdown-exporter');
var ExternalDataUtils = require('objects/utils/external-data-utils');

var Transport = require('gitlab-adapter/transport');

// accessors
var Reaction = require('accessors/reaction');
var Repo = require('accessors/repo');
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
 * @param  {Task} task
 *
 * @return {Promise<Story|null>}
 */
function exportStory(db, system, project, task) {
    return findSourceStory(db, project, task).then((story) => {
        return findDestinationRepo(db, task).then((repoAfter) => {
            return findCurrentRepo(db, story).then((repoBefore) => {
                if (repoBefore && repoAfter) {
                    if (repoBefore.id === repoAfter.id) {
                        return exportStoryUpdate(db, system, project, story, repoAfter, task);
                    } else {
                        return exportStoryMove(db, system, project, story, repoBefore, repoAfter, task);
                    }
                } else if (repoAfter) {
                    return exportStoryCreate(db, system, project, story, repoAfter, task);
                } else if (repoBefore) {
                    return exportStoryRemove(db, system, project, story, repoBefore, task);
                }
            });
        });
    });
}

/**
 * Create or modify an issue
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Project} project
 * @param  {Story} story
 * @param  {Repo} repo
 * @param  {Task} issueLink
 *
 * @return {Promise<Story|null>}
 */
function exportStoryCreate(db, system, project, story, repo, task) {
    return findRepoServer(db, repo).then((server) => {
        return findActingUser(db, task).then((user) => {
            return findAuthors(db, story).then((authors) => {
                var repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
                var glProjectId = repoLink.project.id;
                var glIssueNumber = undefined;
                var userLink = findUserLink(user, server);
                var glUserId = userLink.user.id;
                var glIssueAfter = exportIssueProperties(null, server, system, project, story, authors, task);
                return saveIssue(server, glProjectId, glIssueNumber, glIssueAfter, glUserId).then((glIssue) => {
                    var schema = project.name;
                    var storyAfter = copyIssueProperties(story, server, repo, glIssue);
                    return Story.updateOne(db, schema, storyAfter).then((story) => {
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
 * Modify an existing issue
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Project} project
 * @param  {Story} story
 * @param  {Repo} repo
 * @param  {Task} task
 *
 * @return {Promise<Story|null>}
 */
function exportStoryUpdate(db, system, project, story, repo, task) {
    return findRepoServer(db, repo).then((server) => {
        return findActingUser(db, task).then((user) => {
            return findAuthors(db, story).then((authors) => {
                var issueLink = findIssueLink(story);
                var glProjectId = issueLink.project.id;
                var glIssueNumber = issueLink.issue.number;
                var userLink = findUserLink(user, server);
                var glUserId = userLink.user.id;
                return fetchIssue(server, glProjectId, glIssueNumber).then((glIssue) => {
                    var glIssueAfter = exportIssueProperties(glIssue, server, system, project, story, authors, task);
                    if (glIssueAfter === glIssue) {
                        return null;
                    }
                    return saveIssue(server, glProjectId, glIssueNumber, glIssueAfter, glUserId).then((glIssue) => {
                        var schema = project.name;
                        var storyAfter = copyIssueProperties(story, server, repo, glIssue);
                        return Story.updateOne(db, schema, storyAfter).then((story) => {
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
 * @param  {Repo} repo
 * @param  {Task} task
 *
 * @return {Promise<Story|null>}
 */
function exportStoryRemove(db, system, project, story, repo, task) {
    return findRepoServer(db, repo).then((server) => {
        return findActingUser(db, task).then((user) => {
            var issueLink = findIssueLink(story);
            var glProjectId = issueLink.project.id;
            var glIssueNumber = issueLink.issue.number;
            var userLink = findUserLink(user, server);
            var glUserId = userLink.user.id;
            return removeIssue(server, glProjectId, glIssueNumber, glUserId).then(() => {
                var schema = project.name;
                var storyAfter = deleteIssueProperties(story, server);
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
        });
    }).catch((err) => {
        console.error(err.message);
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
 * @param  {Repo} fromRepo
 * @param  {Repo} toRepo
 * @param  {Task} task
 *
 * @return {Promise<Story|null>}
 */
function exportStoryMove(db, system, project, story, fromRepo, toRepo, task) {
    var fromRepoLink = ExternalDataUtils.findLinkByServerType(fromRepo, 'gitlab');
    var toRepoLink = ExternalDataUtils.findLinkByServerType(toRepo, 'gitlab');
    if (!fromRepoLink) {
        // moving issue from a server that isn't GitLab
        return exportStoryCreate(db, system, project, story, toRepo, task);
    } else if (!toRepoLink) {
        // moving issue to a server that isn't GitLab
        return exportStoryRemove(db, system, project, story, fromRepo, task);
    } else if (fromRepoLink.server_id !== toRepoLink.server_id) {
        // moving issue from one server to another
        return exportStoryCreate(db, system, project, story, toRepo, task).then(() => {
            return exportStoryRemove(db, system, project, story, fromRepo, task);
        });
    }
    return findRepoServer(db, toRepo).then((server) => {
        return findActingUser(db, task).then((user) => {
            var issueLink = findIssueLink(story);
            var glFromProjectId = issueLink.project.id;
            var glFromIssueNumber = issueLink.issue.number;
            var glToProjectId = toRepoLink.project.id;
            var userLink = findUserLink(user, server);
            var glUserId = userLink.user.id;
            return moveIssue(server, glFromProjectId, glFromIssueNumber, glToProjectId, glUserId).then((glIssue) => {
                var schema = project.name;
                var storyAfter = copyIssueProperties(story, server, toRepo, glIssue);
                return Story.updateOne(db, schema, storyAfter).then((story) => {
                    // update tracking, note, and assignment reactions
                    var criteria = {
                        story_id: story.id,
                        type: [ 'tracking', 'note', 'assignment' ],
                        deleted: false,
                    };
                    return Reaction.find(db, schema, criteria, 'id, type, user_id, external').then((reactions) => {
                        var reactionsAfter = _.map(reactions, (reaction) => {
                            return adjustReactionProperties(reaction, server, story);
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
        }).catch((err) => {
            console.error(err.message);
            return null;
        });
    });
}

/**
 * Copy information in a story into a Gitlab issue object
 *
 * @param  {Object} glIssue
 * @param  {Server} server
 * @param  {System} system
 * @param  {Project} project
 * @param  {Story} story
 * @param  {Array<User>} authors
 * @param  {Task} task
 *
 * @param  {Task} task
 *
 * @return {Object}
 */
function exportIssueProperties(glIssue, server, system, project, story, authors, task) {
    var contents = generateIssueText(system, project, story, authors, task);

    var glIssueAfter = _.clone(glIssue) || {};
    ExternalDataUtils.exportProperty(story, server, 'title', glIssueAfter, {
        value: task.options.title,
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
        value: task.options.labels,
        overwrite: 'match-previous:labels',
    });
    if (_.isEqual(glIssueAfter, glIssue)) {
        return glIssue;
    }
    return glIssueAfter;
}

/**
 * Generate issue text suitable GitLab
 *
 * @param  {System} system
 * @param  {Project} project
 * @param  {Story} story
 * @param  {Array<User>} authors
 * @param  {Task} task
 *
 * @return {String}
 */
function generateIssueText(system, project, story, authors, task) {
    var markdown = story.details.markdown;
    var resources = story.details.resources;
    var textVersions = _.filter(story.details.text);
    var text = _.join(textVersions, '\n\n');
    if (!markdown) {
        text = MarkdownExporter.escape(text);
    }
    var authorIds = _.map(authors, 'id');
    if (!_.isEqual(authorIds, [ task.user_id ])) {
        // indicate who wrote the post when user is exporting someone else's post
        var language = Localization.getDefaultLanguageCode(system);
        var authorNames = _.map(authors, (author) => {
            return Localization.name(language, author);
        });
        var opening;
        if (_.trim(text)) {
            opening = Localization.translate(language, 'issue-export-$names-wrote', authorNames);
        } else {
            var resources = story.details.resources;
            var photos = _.size(_.filter(resources, { type: 'image' }));
            var videos = _.size(_.filter(resources, { type: 'video' }));
            var audios = _.size(_.filter(resources, { type: 'audio' }));
            if (photos > 0 || videos > 0 || audios > 0) {
                opening = Localization.translate(language, 'issue-export-$names-posted-$photos-$videos-$audios', authorNames, photos, videos, audios);
            }
        }
        if (opening) {
            text = MarkdownExporter.escape(opening) + '\n\n' + text;
        }
    }
    // append resources
    var address = _.get(system, 'settings.address');
    return MarkdownExporter.attachResources(text, resources, address);
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
function copyIssueProperties(story, server, repo, glIssue) {
    var labelTags = _.map(glIssue.labels, (label) => {
        return `#${_.replace(label, /\s+/g, '-')}`;
    });
    var tags = _.union(story.tags, labelTags);

    var storyAfter = _.cloneDeep(story);
    ExternalDataUtils.inheritLink(storyAfter, server, repo, {
        issue: {
            id: glIssue.id,
            number: glIssue.iid,
        }
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: 'issue',
        overwrite: 'always'
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'tags', {
        value: tags,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.title', {
        value: glIssue.title,
        overwrite: 'always'
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.labels', {
        value: glIssue.labels,
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
 * @param  {Server} server
 *
 * @return {Story}
 */
function deleteIssueProperties(story, server) {
    var storyAfter = _.cloneDeep(story);
    storyAfter.type = 'post';
    storyAfter.etime = null;
    storyAfter.exchange = {};
    delete storyAfter.details.title;
    delete storyAfter.details.labels;
    delete storyAfter.details.exported;
    ExternalDataUtils.removeLink(storyAfter, server);
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
 * @param  {Story} srcIssueLink
 *
 * @return {Reaction}
 */
function adjustReactionProperties(reaction, server, story) {
    var reactionAfter = _.cloneDeep(reaction);
    ExternalDataUtils.inheritLink(reactionAfter, server, story);
    return reactionAfter;
}

/**
 * Find the story that being exported
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {Task} task
 *
 * @return {Promise<Story|null>}
 */
function findSourceStory(db, project, task) {
    var schema = project.name;
    var storyId = task.options.story_id;
    var criteria = {
        id: storyId,
        deleted: false,
    };
    return Story.findOne(db, project.name, criteria, '*').then((story) => {
        if (!story) {
            throw new HTTPError(404, 'Story not found');
        }
        return story;
    });
}

/**
 * Find the repo that the story is being exported to
 *
 * @param  {Database} db
 * @param  {Task} task
 *
 * @return {Promise<Repo|null>}
 */
function findDestinationRepo(db, task) {
    var repoId = task.options.repo_id;
    if (!repoId) {
        return Promise.resolve(null);
    }
    return Repo.findOne(db, 'global', { id: repoId }, '*').then((repo) => {
        if (!repo) {
            throw new HTTPError(404, 'Repo not found');
        }
        return repo;
    });
}

/**
 * Find the repo to which the story was exported to previously
 *
 * @param  {Database} db
 * @param  {Story} story
 *
 * @return {Promise<Repo|null>}
 */
function findCurrentRepo(db, story) {
    var issueLink = findIssueLink(story);
    if (!issueLink) {
        return Promise.resolve(null);
    }
    var repoLink = _.omit(issueLink, 'issue');
    var criteria = {
        external_object: repoLink,
        deleted: false
    };
    return Repo.findOne(db, 'global', criteria, '*').then((repo) => {
        if (!repo) {
            throw new HTTPError(404, 'Repo not found');
        }
        return repo;
    });
}

/**
 * Find the server holding the repo
 *
 * @param  {Database} db
 * @param  {Repo} repo
 *
 * @return {Promise<Server>}
 */
function findRepoServer(db, repo) {
    var repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
    var criteria = {
        id: repoLink.server_id,
        deleted: false
    };
    return Server.findOne(db, 'global', criteria, '*').then((server) => {
        if (!server) {
            throw new HTTPError(404, 'Server not found');
        }
        if (server.disabled) {
            throw new HTTPError(403, 'Server is disabled');
        }
        return server;
    });
}

function findActingUser(db, task) {
    var criteria = {
        id: task.user_id,
        delete: false
    };
    return User.findOne(db, 'global', criteria, '*').then((user) => {
        if (!user) {
            throw new HTTPError(404, 'User not found');
        }
        return user;
    });
}

function findAuthors(db, story) {
    var criteria = {
        id: story.user_ids,
        delete: false
    };
    return User.find(db, 'global', criteria, '*');
}

/**
 * Find a story's issue link
 *
 * @param  {Story} story
 *
 * @return {Object|null}
 */
function findIssueLink(story) {
    var link = ExternalDataUtils.findLinkByServerType(story, 'gitlab');
    if (!link || !link.issue) {
        return null
    }
    return link;
}

/**
 * Find a user's link to a server
 *
 * @param  {Story} story
 *
 * @return {Object}
 */
function findUserLink(user, server) {
    var link = ExternalDataUtils.findLink(user, server);
    if (!link) {
        throw new HTTPError(403, 'User is not associated with a GitLab account')
    }
    return link;
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
    var url = `/projects/${glProjectId}/issues/${glIssueNumber}`;
    return Transport.fetch(server, url);
}

/**
 * Create or update an issue at Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number|undefined} glIssueNumber
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
