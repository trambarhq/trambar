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
  const story = await findSourceStory(db, project, task);
  const repoAfter = await findDestinationRepo(db, task);
  const repoBefore = await findCurrentRepo(db, story);
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
  const server = await findRepoServer(db, repo);
  const user = await findActingUser(db, task);
  const authors = await findAuthors(db, story);
  const repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
  const glProjectID = repoLink.project.id;
  const glIssueNumber = undefined;
  const userLink = findUserLink(user, server);
  const glUserID = userLink.user.id;
  const glIssueChanges = exportIssueProperties(null, server, system, project, story, authors, task);
  const glIssueAfter = await saveIssue(server, glProjectID, glIssueNumber, glIssueChanges, glUserID);
  const schema = project.name;
  const storyChanges = copyIssueProperties(story, server, repo, glIssueAfter);
  const storyAfter = (storyChanges) ? await Story.updateOne(db, schema, storyChanges) : story;
  const reactionChanges = copyTrackingReactionProperties(null, server, project, storyAfter, user);
  const reaction = await Reaction.insertOne(db, schema, reactionChanges);
  return storyAfter;
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
 * @return {Promise<Story>}
 */
async function exportStoryUpdate(db, system, project, story, repo, task) {
  const server = await findRepoServer(db, repo);
  const user = await findActingUser(db, task);
  const authors = await findAuthors(db, story);
  const issueLink = findIssueLink(story);
  const glProjectID = issueLink.project.id;
  const glIssueNumber = issueLink.issue.number;
  const userLink = findUserLink(user, server);
  const glUserID = userLink.user.id;
  const glIssue = await fetchIssue(server, glProjectID, glIssueNumber);
  const glIssueChanges = exportIssueProperties(glIssue, server, system, project, story, authors, task);
  const glIssueAfter = (glIssueChanges) ? await saveIssue(server, glProjectID, glIssueNumber, glIssueChanges, glUserID) : glIssue;
  const schema = project.name;
  const storyChanges = copyIssueProperties(story, server, repo, glIssueAfter);
  const storyAfter = (storyChanges) ? await Story.updateOne(db, schema, storyChanges) : story;
  return storyAfter;
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
 * @return {Promise<Story>}
 */
async function exportStoryRemove(db, system, project, story, repo, task) {
  const server = await findRepoServer(db, repo);
  const user = await findActingUser(db, task);
  const issueLink = findIssueLink(story);
  const glProjectID = issueLink.project.id;
  const glIssueNumber = issueLink.issue.number;
  const userLink = findUserLink(user, server);
  await removeIssue(server, glProjectID, glIssueNumber);
  const schema = project.name;
  const storyChanges = deleteIssueProperties(story, server);
  const storyAfter = await Story.updateOne(db, schema, storyChanges);
  // remove tracking, note, and assignment reactions
  const criteria = {
    story_id: story.id,
    type: [ 'tracking', 'note', 'assignment' ],
    deleted: false,
  };
  const reactions = await Reaction.find(db, schema, criteria, 'id');
  const reactionChanges = _.map(reactions, (reaction) => {
    return { id: reaction.id, deleted: true };
  });
  await Reaction.save(db, schema, reactionChanges);
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
 * @return {Promise<Story>}
 */
async function exportStoryMove(db, system, project, story, fromRepo, toRepo, task) {
  const fromRepoLink = ExternalDataUtils.findLinkByServerType(fromRepo, 'gitlab');
  const toRepoLink = ExternalDataUtils.findLinkByServerType(toRepo, 'gitlab');
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
  const server = await findRepoServer(db, toRepo);
  const user = await findActingUser(db, task);
  const issueLink = findIssueLink(story);
  const glFromProjectID = issueLink.project.id;
  const glFromIssueNumber = issueLink.issue.number;
  const glToProjectID = toRepoLink.project.id;
  const userLink = findUserLink(user, server);
  const glIssueAfter = await moveIssue(server, glFromProjectID, glFromIssueNumber, glToProjectID);
  const schema = project.name;
  const storyChanges = copyIssueProperties(story, server, toRepo, glIssueAfter);
  const storyAfter = (storyChanges) ? await Story.updateOne(db, schema, storyChanges) : story;
  // update tracking, note, and assignment reactions
  const criteria = {
    story_id: storyAfter.id,
    type: [ 'tracking', 'note', 'assignment' ],
    deleted: false,
  };
  const reactions = await Reaction.find(db, schema, criteria, 'id, type, user_id, external');
  const reactionChanges = _.map(reactions, (reaction) => {
    return adjustReactionProperties(reaction, server, story);
  });
  // if the different user is moving the issue, add
  // a tracking reaction for him as well
  if (!_.some(reactionChanges, { type: 'tracking', user_id: user.id })) {
    const reactionNew = copyTrackingReactionProperties(null, server, project, story, user);
    reactionChanges.push(reactionNew);
  }
  await Reaction.save(db, schema, reactionChanges);
  return storyAfter;
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
  const contents = generateIssueText(system, project, story, authors, task);

  const glIssueChanges = _.cloneDeep(glIssue) || {};
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
    return null;
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
  const markdown = story.details.markdown;
  const resources = story.details.resources;
  const textVersions = _.filter(story.details.text);
  const text = _.join(textVersions, '\n\n');
  if (!markdown) {
    text = MarkdownExporter.escape(text);
  }
  const authorIDs = _.map(authors, 'id');
  if (!_.isEqual(authorIDs, [ task.user_id ])) {
    // indicate who wrote the post when user is exporting someone else's post
    const language = Localization.getDefaultLanguageCode(system);
    const authorNames = _.map(authors, (author) => {
      return Localization.name(language, author);
    });
    let opening;
    if (_.trim(text)) {
      opening = Localization.translate(language, 'issue-export-$names-wrote', authorNames);
    } else {
      const resources = story.details.resources;
      const photos = _.size(_.filter(resources, { type: 'image' }));
      const videos = _.size(_.filter(resources, { type: 'video' }));
      const audios = _.size(_.filter(resources, { type: 'audio' }));
      if (photos > 0 || videos > 0 || audios > 0) {
        opening = Localization.translate(language, 'issue-export-$names-posted-$photos-$videos-$audios', authorNames, photos, videos, audios);
      }
    }
    if (opening) {
      text = MarkdownExporter.escape(opening) + '\n\n' + text;
    }
  }
  // append resources
  const address = _.get(system, 'settings.address');
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
  const labelTags = _.map(glIssue.labels, (label) => {
    return `#${_.replace(label, /\s+/g, '-')}`;
  });
  const tags = _.union(story.tags, labelTags);

  const storyChanges = _.cloneDeep(story);
  ExternalDataUtils.inheritLink(storyChanges, server, repo, {
    issue: {
      id: glIssue.id,
      number: glIssue.iid,
    }
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'type', {
    value: 'issue',
    overwrite: 'always'
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'tags', {
    value: tags,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.title', {
    value: glIssue.title,
    overwrite: 'always'
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.labels', {
    value: glIssue.labels,
    overwrite: 'always'
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.exported', {
    value: true,
    overwrite: 'always'
  });
  if (_.isEqual(storyChanges, story)) {
    return null;
  }
  storyChanges.etime = new String('NOW()');
  return storyChanges;
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
  const storyChanges = _.cloneDeep(story);
  storyChanges.type = 'post';
  storyChanges.etime = null;
  storyChanges.exchange = {};
  delete storyChanges.details.title;
  delete storyChanges.details.labels;
  delete storyChanges.details.exported;
  ExternalDataUtils.removeLink(storyChanges, server);
  return storyChanges;
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
  const reactionChanges = _.cloneDeep(reaction) || {};
  ExternalDataUtils.inheritLink(reactionChanges, server, story);
  ExternalDataUtils.importProperty(reactionChanges, server, 'type', {
    value: 'tracking',
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(reactionChanges, server, 'story_id', {
    value: story.id,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(reactionChanges, server, 'user_id', {
    value: user.id,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(reactionChanges, server, 'public', {
    value: story.public,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(reactionChanges, server, 'published', {
    value: true,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(reactionChanges, server, 'ptime', {
    value: Moment().toISOString(),
    overwrite: 'always',
  });
  if (_.isEqual(reactionChanges, reaction)) {
    return null;
  }
  reactionChanges.itime = new String('NOW()');
  return reactionChanges;
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
  const reactionAfter = _.cloneDeep(reaction);
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
  const schema = project.name;
  const storyID = task.options.story_id;
  const criteria = {
    id: storyID,
    deleted: false,
  };
  const story = await Story.findOne(db, project.name, criteria, '*');
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
  const repoID = task.options.repo_id;
  if (!repoID) {
    return null;
  }
  const repo = await Repo.findOne(db, 'global', { id: repoID }, '*');
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
  const issueLink = findIssueLink(story);
  if (!issueLink) {
    return null;
  }
  const repoLink = _.omit(issueLink, 'issue');
  const criteria = {
    external_object: repoLink,
    deleted: false
  };
  const repo = await Repo.findOne(db, 'global', criteria, '*');
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
  const repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
  const criteria = {
    id: repoLink.server_id,
    deleted: false
  };
  const server = await Server.findOne(db, 'global', criteria, '*');
  if (!server) {
    throw new HTTPError(404, 'Server not found');
  }
  if (server.disabled) {
    throw new HTTPError(403, 'Server is disabled');
  }
  return server;
}

async function findActingUser(db, task) {
  const criteria = {
    id: task.user_id,
    deleted: false
  };
  const user = await User.findOne(db, 'global', criteria, '*');
  if (!user) {
    throw new HTTPError(404, 'User not found');
  }
  return user;
}

async function findAuthors(db, story) {
  const criteria = {
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
  const link = ExternalDataUtils.findLinkByServerType(story, 'gitlab');
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
  const link = ExternalDataUtils.findLink(user, server);
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
  const url = `/projects/${glProjectID}/issues/${glIssueNumber}`;
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
  const url = `/projects/${glProjectID}/issues`;
  const props = {
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
  const url = `/projects/${glProjectID}/issues/${glIssueNumber}`;
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
  const url = `/projects/${glSrcProjectID}/issues/${glSrcIssueNumber}/move`;
  const props = { to_project_id: glDstProjectID };
  return Transport.post(server, url, props);
}

export {
  exportStory,
};
