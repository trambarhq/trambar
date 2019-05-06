import _ from 'lodash';
import Moment from 'moment';
import * as TaskLog from '../task-log.mjs';
import * as Localization from '../localization.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as MarkdownExporter from '../common/utils/markdown-exporter.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as Transport from './transport.mjs';

// accessors
import Reaction from '../accessors/reaction.mjs';
import Repo from '../accessors/repo.mjs';
import Story from '../accessors/story.mjs';
import Server from '../accessors/server.mjs';
import System from '../accessors/system.mjs';
import User from '../accessors/user.mjs';

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
async function exportStory(db, system, project, task) {
    let story = await findSourceStory(db, project, task);
    let repoAfter = await findDestinationRepo(db, task);
    let repoBefore = await findCurrentRepo(db, story);
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
async function exportStoryCreate(db, system, project, story, repo, task) {
    let server = await findRepoServer(db, repo);
    let user = await findActingUser(db, task);
    let authors = await findAuthors(db, story);
    let repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
    let glProjectID = repoLink.project.id;
    let glIssueNumber = undefined;
    let userLink = findUserLink(user, server);
    let glUserID = userLink.user.id;
    let glIssueAfter = exportIssueProperties(null, server, system, project, story, authors, task);
    let glIssue = await saveIssue(server, glProjectID, glIssueNumber, glIssueAfter, glUserID);
    let schema = project.name;
    let storyAfter = copyIssueProperties(story, server, repo, glIssue);
    story = await Story.updateOne(db, schema, storyAfter);
    let reactionNew = copyTrackingReactionProperties(null, server, project, story, user);
    let reaction = await Reaction.insertOne(db, schema, reactionNew);
    return story;
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
async function exportStoryUpdate(db, system, project, story, repo, task) {
    let server = await findRepoServer(db, repo);
    let user = await findActingUser(db, task);
    let authors = await findAuthors(db, story);
    let issueLink = findIssueLink(story);
    let glProjectID = issueLink.project.id;
    let glIssueNumber = issueLink.issue.number;
    let userLink = findUserLink(user, server);
    let glUserID = userLink.user.id;
    let glIssue = await fetchIssue(server, glProjectID, glIssueNumber);
    let glIssueAfter = exportIssueProperties(glIssue, server, system, project, story, authors, task);
    if (glIssueAfter === glIssue) {
        return null;
    }
    glIssue = await saveIssue(server, glProjectID, glIssueNumber, glIssueAfter, glUserID);
    let schema = project.name;
    let storyAfter = copyIssueProperties(story, server, repo, glIssue);
    if (story !== storyAfter) {
        story = await Story.updateOne(db, schema, storyAfter);
    }
    return story;
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
async function exportStoryRemove(db, system, project, story, repo, task) {
    let server = await findRepoServer(db, repo);
    let user = await findActingUser(db, task);
    let issueLink = findIssueLink(story);
    let glProjectID = issueLink.project.id;
    let glIssueNumber = issueLink.issue.number;
    let userLink = findUserLink(user, server);
    await removeIssue(server, glProjectID, glIssueNumber);
    let schema = project.name;
    let storyAfter = deleteIssueProperties(story, server);
    story = await Story.updateOne(db, schema, storyAfter);
    // remove tracking, note, and assignment reactions
    let criteria = {
        story_id: story.id,
        type: [ 'tracking', 'note', 'assignment' ],
        deleted: false,
    };
    let reactions = await Reaction.find(db, schema, criteria, 'id');
    let reactionsAfter = _.map(reactions, (reaction) => {
        return { id: reaction.id, deleted: true };
    });
    await Reaction.save(db, schema, reactionsAfter);
    return story;
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
async function exportStoryMove(db, system, project, story, fromRepo, toRepo, task) {
    let fromRepoLink = ExternalDataUtils.findLinkByServerType(fromRepo, 'gitlab');
    let toRepoLink = ExternalDataUtils.findLinkByServerType(toRepo, 'gitlab');
    if (!fromRepoLink) {
        // moving issue from a server that isn't GitLab
        return exportStoryCreate(db, system, project, story, toRepo, task);
    } else if (!toRepoLink) {
        // moving issue to a server that isn't GitLab
        return exportStoryRemove(db, system, project, story, fromRepo, task);
    } else if (fromRepoLink.server_id !== toRepoLink.server_id) {
        // moving issue from one server to another
        await exportStoryCreate(db, system, project, story, toRepo, task);
        return exportStoryRemove(db, system, project, story, fromRepo, task);
    }
    let server = await findRepoServer(db, toRepo);
    let user = await findActingUser(db, task);
    let issueLink = findIssueLink(story);
    let glFromProjectID = issueLink.project.id;
    let glFromIssueNumber = issueLink.issue.number;
    let glToProjectID = toRepoLink.project.id;
    let userLink = findUserLink(user, server);
    let glIssue = await moveIssue(server, glFromProjectID, glFromIssueNumber, glToProjectID);
    let schema = project.name;
    let storyAfter = copyIssueProperties(story, server, toRepo, glIssue);
    story = await Story.updateOne(db, schema, storyAfter);
    // update tracking, note, and assignment reactions
    let criteria = {
        story_id: story.id,
        type: [ 'tracking', 'note', 'assignment' ],
        deleted: false,
    };
    let reactions = await Reaction.find(db, schema, criteria, 'id, type, user_id, external');
    let reactionsAfter = _.map(reactions, (reaction) => {
        return adjustReactionProperties(reaction, server, story);
    });
    // if the different user is moving the issue, add
    // a tracking reaction for him as well
    if (!_.some(reactionsAfter, { type: 'tracking', user_id: user.id })) {
        let reactionNew = copyTrackingReactionProperties(null, server, project, story, user);
        reactionsAfter.push(reactionNew);
    }
    await Reaction.save(db, schema, reactionsAfter);
    return story;
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
    let contents = generateIssueText(system, project, story, authors, task);

    let glIssueAfter = _.clone(glIssue) || {};
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
    let markdown = story.details.markdown;
    let resources = story.details.resources;
    let textVersions = _.filter(story.details.text);
    let text = _.join(textVersions, '\n\n');
    if (!markdown) {
        text = MarkdownExporter.escape(text);
    }
    let authorIDs = _.map(authors, 'id');
    if (!_.isEqual(authorIDs, [ task.user_id ])) {
        // indicate who wrote the post when user is exporting someone else's post
        let language = Localization.getDefaultLanguageCode(system);
        let authorNames = _.map(authors, (author) => {
            return Localization.name(language, author);
        });
        let opening;
        if (_.trim(text)) {
            opening = Localization.translate(language, 'issue-export-$names-wrote', authorNames);
        } else {
            let resources = story.details.resources;
            let photos = _.size(_.filter(resources, { type: 'image' }));
            let videos = _.size(_.filter(resources, { type: 'video' }));
            let audios = _.size(_.filter(resources, { type: 'audio' }));
            if (photos > 0 || videos > 0 || audios > 0) {
                opening = Localization.translate(language, 'issue-export-$names-posted-$photos-$videos-$audios', authorNames, photos, videos, audios);
            }
        }
        if (opening) {
            text = MarkdownExporter.escape(opening) + '\n\n' + text;
        }
    }
    // append resources
    let address = _.get(system, 'settings.address');
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
    let labelTags = _.map(glIssue.labels, (label) => {
        return `#${_.replace(label, /\s+/g, '-')}`;
    });
    let tags = _.union(story.tags, labelTags);

    let storyAfter = _.cloneDeep(story);
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
    let storyAfter = _.cloneDeep(story);
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
    let reactionAfter = _.clone(reaction) || {};
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
    let reactionAfter = _.cloneDeep(reaction);
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
async function findSourceStory(db, project, task) {
    let schema = project.name;
    let storyID = task.options.story_id;
    let criteria = {
        id: storyID,
        deleted: false,
    };
    let story = await Story.findOne(db, project.name, criteria, '*');
    if (!story) {
        throw new HTTPError(404, 'Story not found');
    }
    return story;
}

/**
 * Find the repo that the story is being exported to
 *
 * @param  {Database} db
 * @param  {Task} task
 *
 * @return {Promise<Repo|null>}
 */
async function findDestinationRepo(db, task) {
    let repoID = task.options.repo_id;
    if (!repoID) {
        return null;
    }
    let repo = await Repo.findOne(db, 'global', { id: repoID }, '*');
    if (!repo) {
        throw new HTTPError(404, 'Repo not found');
    }
    return repo;
}

/**
 * Find the repo to which the story was exported to previously
 *
 * @param  {Database} db
 * @param  {Story} story
 *
 * @return {Promise<Repo|null>}
 */
async function findCurrentRepo(db, story) {
    let issueLink = findIssueLink(story);
    if (!issueLink) {
        return null;
    }
    let repoLink = _.omit(issueLink, 'issue');
    let criteria = {
        external_object: repoLink,
        deleted: false
    };
    let repo = await Repo.findOne(db, 'global', criteria, '*');
    if (!repo) {
        throw new HTTPError(404, 'Repo not found');
    }
    return repo;
}

/**
 * Find the server holding the repo
 *
 * @param  {Database} db
 * @param  {Repo} repo
 *
 * @return {Promise<Server>}
 */
async function findRepoServer(db, repo) {
    let repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
    let criteria = {
        id: repoLink.server_id,
        deleted: false
    };
    let server = await Server.findOne(db, 'global', criteria, '*');
    if (!server) {
        throw new HTTPError(404, 'Server not found');
    }
    if (server.disabled) {
        throw new HTTPError(403, 'Server is disabled');
    }
    return server;
}

async function findActingUser(db, task) {
    let criteria = {
        id: task.user_id,
        deleted: false
    };
    let user = await User.findOne(db, 'global', criteria, '*');
    if (!user) {
        throw new HTTPError(404, 'User not found');
    }
    return user;
}

async function findAuthors(db, story) {
    let criteria = {
        id: story.user_ids,
        deleted: false
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
    let link = ExternalDataUtils.findLinkByServerType(story, 'gitlab');
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
    let link = ExternalDataUtils.findLink(user, server);
    if (!link) {
        throw new HTTPError(403, 'User is not associated with a GitLab account')
    }
    return link;
}

/**
 * Retrieve issue from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 * @param  {Number} glIssueNumber
 *
 * @return {Promise<Object>}
 */
async function fetchIssue(server, glProjectID, glIssueNumber) {
    let url = `/projects/${glProjectID}/issues/${glIssueNumber}`;
    return Transport.fetch(server, url);
}

/**
 * Create or update an issue at Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 * @param  {Number|undefined} glIssueNumber
 * @param  {Object} glIssue
 * @param  {Number} glUserID
 *
 * @return {Promise<Object>}
 */
async function saveIssue(server, glProjectID, glIssueNumber, glIssue, glUserID) {
    let url = `/projects/${glProjectID}/issues`;
    let props = {
        title: glIssue.title,
        description: glIssue.description,
        state: glIssue.state,
        labels: _.join(glIssue.labels, ','),
        confidential: glIssue.confidential,
    };
    if (glIssueNumber) {
        url += `/${glIssueNumber}`;
        return Transport.put(server, url, props, glUserID);
    } else {
        return Transport.post(server, url, props, glUserID);
    }
}

/**
 * Delete issue at Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 * @param  {Number} glIssueNumber
 *
 * @return {Promise}
 */
async function removeIssue(server, glProjectID, glIssueNumber) {
    let url = `/projects/${glProjectID}/issues/${glIssueNumber}`;
    return Transport.remove(server, url);
}

/**
 * Move an issue at Gitlab from one project to another
 *
 * @param  {Server} server
 * @param  {Number} glSrcProjectID
 * @param  {Number} glSrcIssueNumber
 * @param  {Number} glDstProjectID
 *
 * @return {Promise<Object>}
 */
async function moveIssue(server, glSrcProjectID, glSrcIssueNumber, glDstProjectID) {
    let url = `/projects/${glSrcProjectID}/issues/${glSrcIssueNumber}/move`;
    let props = { to_project_id: glDstProjectID };
    return Transport.post(server, url, props);
}

export {
    exportStory,
};
