import _ from 'lodash';
import Moment from 'moment';
import { getDefaultLanguageCode } from '../localization.mjs';
import { findTagsInMarkdown } from '../text-utils.mjs';
import { findLink, inheritLink, extendLink, importProperty } from '../external-data-utils.mjs';

import * as Transport from './transport.mjs';
import * as AssignmentImporter from './assignment-importer.mjs';

// accessors
import { Story } from '../accessors/story.mjs';

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {boolean}
 */
async function processEvent(db, system, server, repo, project, author, glEvent) {
  if (!glEvent.target_id) {
    return;
  }
  const schema = project.name;
  const repoLink = findLink(repo, server);
  const glIssue = await fetchIssue(server, repoLink.project.id, glEvent.target_id);
  // the story is linked to both the issue and the repo
  const criteria = {
    external_object: extendLink(server, repo, {
      issue: { id: glIssue.id }
    }),
  };
  const story = await Story.findOne(db, schema, criteria, '*');
  const assignments = await AssignmentImporter.findIssueAssignments(db, server, glIssue);
  const opener = (glEvent.action_name === 'opened') ? author : null;
  const storyChanges = copyIssueProperties(story, system, server, repo, opener, assignments, glIssue);
  const storyAfter = (storyChanges) ? await Story.saveOne(db, schema, storyChanges) : story;
  try {
    await AssignmentImporter.importAssignments(db, server, project, repo, storyAfter, assignments);
  } catch (err) {
    if (err instanceof AssignmentImporter.ObjectMovedError) {
      // the issue has been moved to a different repo--delete the
      // story if it was imported
      if (storyAfter) {
        await Story.saveOne(db, schema, { id: storyAfter.id, deleted: true });
      }
    } else {
      throw err;
    }
  }
}

/**
 * Handle a Gitlab hook event concerning an issue
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 */
async function processHookEvent(db, system, server, repo, project, author, glHookEvent) {
  if (glHookEvent.object_attributes.action !== 'update') {
    return;
  }
  // construct a glIssue object from data in hook event
  const repoLink = findLink(repo, server);
  const glIssue = _.omit(glHookEvent.object_attributes, 'action');
  glIssue.project_id = repoLink.project.id;
  glIssue.labels = _.map(glHookEvent.labels, 'title');
  if (glHookEvent.assignee) {
    glIssue.assignee = {
      ...glHookEvent.assignee,
      id: glHookEvent.object_attributes.assignee_id,
    };
  }

  // find existing story
  const schema = project.name;
  const criteria = {
    external_object: extendLink(server, repo, {
      issue: { id: glIssue.id }
    }),
  };
  const story = await Story.findOne(db, schema, criteria, '*');
  if (!story) {
    throw new Error('Story not found');
  }
  const assignments = await AssignmentImporter.findIssueAssignments(db, server, glIssue);
  // the author of the hook event isn't the issue's author,
  // hence we're passing null here
  const opener = null;
  const storyChanges = copyIssueProperties(story, system, server, repo, opener, assignments, glIssue);
  const storyAfter = (storyChanges) ? Story.updateOne(db, schema, storyAfter) : story;
  try {
    await AssignmentImporter.importAssignments(db, server, project, repo, storyAfter, assignments);
  } catch (err) {
    if (err instanceof AssignmentImporter.ObjectMovedError) {
      // the issue has been moved to a different repo--delete the
      // story if it was imported
      if (storyAfter) {
        await Story.saveOne(db, schema, { id: storyAfter.id, deleted: true });
      }
    } else {
      throw err;
    }
  }
}

/**
 * Copy certain properties of the issue into the story
 *
 * From Gitlab documentation:
 *
 *   id - is uniq across all Issues table
 *   iid - is uniq only in scope of single project
 *
 * @param  {Story|null} story
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} opener
 * @param  {Object[]} assignments
 * @param  {Object} glIssue
 *
 * @return {Story}
 */
function copyIssueProperties(story, system, server, repo, opener, assignments, glIssue) {
  const descriptionTags = findTagsInMarkdown(glIssue.description);
  const labelTags = _.map(glIssue.labels, (label) => {
    return `#${_.replace(label, /\s+/g, '-')}`;
  });
  const tags = _.union(descriptionTags, labelTags);
  const defLangCode = getDefaultLanguageCode(system);

  const state = glIssue.state;
  if (state === 'opened') {
    if (story) {
      // GitLab 11 doesn't report a state of reopened anymore
      // derived it based on the previous state
      const prevState = story.details.state;
      if (prevState === 'closed' || prevState === 'reopened') {
        state = 'reopened';
      }
    }
  }

  const storyChanges = _.cloneDeep(story) || {};
  inheritLink(storyChanges, server, repo, {
    issue: {
      id: glIssue.id,
      number: glIssue.iid,
    }
  });
  const exported = !!storyChanges.etime;
  importProperty(storyChanges, server, 'type', {
    value: 'issue',
    overwrite: 'always',
  });
  importProperty(storyChanges, server, 'tags', {
    value: tags,
    overwrite: 'always',
  });
  importProperty(storyChanges, server, 'language_codes', {
    value: [ defLangCode ],
    overwrite: 'always',
    ignore: exported,
  });
  if (opener) {
    importProperty(storyChanges, server, 'user_ids', {
      value: [ opener.id ],
      overwrite: 'always',
      ignore: exported,
    });
    importProperty(storyChanges, server, 'role_ids', {
      value: opener.role_ids,
      overwrite: 'always',
      ignore: exported,
    });
  }
  importProperty(storyChanges, server, 'details.title', {
    value: glIssue.title,
    overwrite: 'match-previous:title',
  });
  importProperty(storyChanges, server, 'details.labels', {
    value: glIssue.labels,
    overwrite: 'match-previous:labels',
  });
  importProperty(storyChanges, server, 'details.state', {
    value: state,
    overwrite: 'always',
    ignore: exported,
  });
  importProperty(storyChanges, server, 'details.milestone', {
    value: _.get(glIssue, 'milestone.title'),
    overwrite: 'always',
    ignore: exported,
  });
  importProperty(storyChanges, server, 'published', {
    value: true,
    overwrite: 'always',
    ignore: exported,
  });
  importProperty(storyChanges, server, 'public', {
    value: !glIssue.confidential,
    overwrite: 'always',
    ignore: exported,
  });
  importProperty(storyChanges, server, 'ptime', {
    value: Moment(new Date(glIssue.created_at)).toISOString(),
    overwrite: 'always',
    ignore: exported,
  });
  if (_.isEqual(storyChanges, story)) {
    return null;
  }
  if (story) {
    if (story.details.state !== storyChanges.details.state) {
      // bump the story when its state changes
      storyChanges.btime = Moment().toISOString();
    }
  }
  storyChanges.itime = new String('NOW()');
  return storyChanges;
}

/**
 * Retrieve issue from Gitlab
 *
 * @param  {Server} server
 * @param  {number} glProjectId
 * @param  {number} glIssueId
 *
 * @return {Object}
 */
async function fetchIssue(server, glProjectId, glIssueId) {
  // Gitlab wants the issue IID (i.e. issue number), which unfortunately isn't
  // included in the activity log entry
  const glIssueNumber = await getIssueNumber(server, glProjectId, glIssueId);
  const url = `/projects/${glProjectId}/issues/${glIssueNumber}`;
  return Transport.fetch(server, url);
}

/**
 * Return the issue number given an issue id, fetching the full issue list to
 * find the mapping
 *
 * @param  {Server} server
 * @param  {number} glProjectId
 * @param  {number} glIssueId
 *
 * @return {number}
 */
async function getIssueNumber(server, glProjectId, glIssueId) {
  const baseURL = _.get(server, 'settings.oauth.base_url');
  let issueNumber = _.get(issueNumberCache, [ baseURL, glProjectId, glIssueId ]);
  if (!issueNumber) {
    const url = `/projects/${glProjectId}/issues`;
    await Transport.fetchEach(server, url, {}, (glIssue) => {
      _.set(issueNumberCache, [ baseURL, glProjectId, glIssue.id ], glIssue.iid);
      if (glIssueId === glIssue.id) {
        return false;
      }
    });
    issueNumber = _.get(issueNumberCache, [ baseURL, glProjectId, glIssueId ]);
    if (!issueNumber) {
      return Promise.reject(new HTTPError(404));
    }
  }
  return issueNumber;
}

const issueNumberCache = {};

/**
 * Retrieve issue from Gitlab by issue number
 *
 * @param  {Server} server
 * @param  {number} glProjectId
 * @param  {number} glIssueId
 *
 * @return {Object}
 */
async function fetchIssueByNumber(server, glProjectId, glIssueNumber) {
  const url = `/projects/${glProjectId}/issues/${glIssueNumber}`;
  return Transport.fetch(server, url);
}

export {
  processEvent,
  processHookEvent,
};
