import _ from 'lodash';
import Moment from 'moment';
import { getDefaultLanguageCode } from '../localization.mjs';
import { findTags } from '../tag-scanner.mjs';
import * as ExternalDataUtils from '../external-data-utils.mjs';
import { HTTPError } from '../errors.mjs';

import * as Transport from './transport.mjs';
import * as AssignmentImporter from './assignment-importer.mjs';

// accessors
import { Reaction } from '../accessors/reaction.mjs';
import { Story } from '../accessors/story.mjs';

/**
 * Import an activity log entry about an merge request
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise}
 */
async function processEvent(db, system, server, repo, project, author, glEvent) {
  if (!glEvent.target_id) {
    return;
  }
  const schema = project.name;
  const repoLink = ExternalDataUtils.findLink(repo, server);
  const glMergeRequest = await fetchMergeRequest(server, repoLink.project.id, glEvent.target_id);
  // the story is linked to both the merge request and the repo
  const criteria = {
    external_object: ExternalDataUtils.extendLink(server, repo, {
      merge_request: { id: glMergeRequest.id }
    })
  };
  const story = await Story.findOne(db, schema, criteria, '*');
  const assignments = await AssignmentImporter.findMergeRequestAssignments(db, server, glMergeRequest);
  const opener = (glEvent.action_name === 'opened') ? author : null;
  const storyChanges = copyMergeRequestProperties(story, system, server, repo, opener, assignments, glMergeRequest);
  const storyAfter = (storyChanges) ? await Story.saveOne(db, schema, storyAfter) : story;
  try {
    await AssignmentImporter.importAssignments(db, server, project, repo, storyAfter, assignments);
  } catch (err) {
    if (err instanceof AssignmentImporter.ObjectMovedError) {
      // the merge request has been moved to a different repo--delete the
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
 * Handle a Gitlab hook event concerning an merge request
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise}
 */
async function processHookEvent(db, system, server, repo, project, author, glHookEvent) {
  if (glHookEvent.object_attributes.action !== 'update') {
    return;
  }
  // construct a glMergeRequest object from data in hook event
  const repoLink = ExternalDataUtils.findLink(repo, server);
  const glMergeRequest = _.omit(glHookEvent.object_attributes, 'action');
  glMergeRequest.project_id = repoLink.project.id;
  glMergeRequest.labels = _.map(glHookEvent.labels, 'title');
  if (glHookEvent.assignee) {
    glMergeRequest.assignee = {
      ...glHookEvent.assignee,
      id: glHookEvent.object_attributes.assignee_id,
    };
  }

  // find existing story
  const schema = project.name;
  const criteria = {
    external_object: ExternalDataUtils.extendLink(server, repo, {
      merge_request: { id: glMergeRequest.id }
    }),
  };
  const story = await Story.findOne(db, schema, criteria, '*');
  if (!story) {
    throw new HTTPError(404, 'Story not found');
  }
  const assignments = await AssignmentImporter.findMergeRequestAssignments(db, server, glMergeRequest);
  // the author of the hook event isn't the merge request's author,
  // hence we're passing null here
  const opener = null;
  const storyChanges = copyMergeRequestProperties(story, system, server, repo, opener, assignments, glMergeRequest);
  const storyAfter = (storyChanges) ? await Story.updateOne(db, schema, storyAfter) : story;
  await AssignmentImporter.importAssignments(db, server, project, repo, storyAfter, assignments);
}

/**
 * Copy certain properties of the merge request into the story
 *
 * From Gitlab documentation:
 *
 *   id - is uniq across all MergeRequests table
 *   iid - is uniq only in scope of single project
 *
 * @param  {Story|null} story
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} opener
 * @param  {Array<Object>} assignments
 * @param  {Object} glMergeRequest
 *
 * @return {Story}
 */
function copyMergeRequestProperties(story, system, server, repo, opener, assignments, glMergeRequest) {
  const descriptionTags = findTags(glMergeRequest.description, true);
  const labelTags = _.map(glMergeRequest.labels, (label) => {
    return `#${_.replace(label, /\s+/g, '-')}`;
  });
  const tags = _.union(descriptionTags, labelTags);
  const defLangCode = getDefaultLanguageCode(system);

  const storyChanges = _.cloneDeep(story) || {};
  ExternalDataUtils.inheritLink(storyChanges, server, repo, {
    merge_request: {
      id: glMergeRequest.id,
      number: glMergeRequest.iid,
    }
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'type', {
    value: 'merge-request',
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'tags', {
    value: tags,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'language_codes', {
    value: [ defLangCode ],
    overwrite: 'always',
  });
  if (opener) {
    ExternalDataUtils.importProperty(storyChanges, server, 'user_ids', {
      value: [ opener.id ],
      overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'role_ids', {
      value: opener.role_ids,
      overwrite: 'always',
    });
  }
  ExternalDataUtils.importProperty(storyChanges, server, 'details.state', {
    value: glMergeRequest.state,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.branch', {
    value: glMergeRequest.target_branch,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.source_branch', {
    value: glMergeRequest.source_branch,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.labels', {
    value: glMergeRequest.labels,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.milestone', {
    value: _.get(glMergeRequest, 'milestone.title'),
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.title', {
    value: glMergeRequest.title,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'published', {
    value: true,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'public', {
    value: !glMergeRequest.confidential,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'ptime', {
    value: Moment(new Date(glMergeRequest.created_at)).toISOString(),
    overwrite: 'always',
  });
  if (_.isEqual(storyChanges, story)) {
    return null;
  }
  storyChanges.itime = new String('NOW()');
  return storyChanges;
}

/**
 * Retrieve merge request from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glMergeRequestNumber
 *
 * @return {Object}
 */
async function fetchMergeRequest(server, glProjectId, glMergeRequestNumber) {
  const url = `/projects/${glProjectId}/merge_requests/${glMergeRequestNumber}`;
  return Transport.fetch(server, url);
}

export {
  processEvent,
  processHookEvent,
};
