import _ from 'lodash';
import Moment from 'moment';
import { getDefaultLanguageCode } from '../localization.mjs';
import { findTagsInMarkdown } from '../text-utils.mjs';
import * as ExternalDataUtils from '../external-data-utils.mjs';

import * as Transport from './transport.mjs';

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
 * @return {Promise}
 */
async function processEvent(db, system, server, repo, project, author, glEvent) {
  if (!glEvent.target_id) {
    // milestone was deleted
    return;
  }
  const schema = project.name;
  const repoLink = ExternalDataUtils.findLink(repo, server);
  const glMilestone = await fetchMilestone(server, repoLink.project.id, glEvent.target_id);
  // the story is linked to both the issue and the repo
  const criteria = {
    external_object: ExternalDataUtils.extendLink(server, repo, {
      milestone: { id: glMilestone.id }
    }),
  };
  const story = await Story.findOne(db, schema, criteria, '*');
  const storyChanges = copyMilestoneProperties(story, system, server, repo, author, glMilestone);
  const storyAfter = (storyChanges) ? await Story.saveOne(db, schema, storyChanges) : story;
}

/**
 * Update properties of milestone stories
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise<Boolean>}
 */
async function updateMilestones(db, system, server, repo, project) {
  const schema = project.name;
  const repoLink = ExternalDataUtils.findLink(repo, server);
  // find milestone stories
  const criteria = {
    type: 'milestone',
    external_object: repoLink,
    deleted: false,
  };
  const stories = await Story.find(db, schema, criteria, '*');
  // fetch milestones from GitLab
  const glMilestones = await fetchMilestones(server, repoLink.project.id);
  // delete ones that no longer exists
  let deleteCount = 0, updateCount = 0;
  for (let story of stories) {
    const storyLink = ExternalDataUtils.findLink(story, server);
    if (!_.some(glMilestones, { id: storyLink.milestone.id })) {
      await Story.updateOne(db, schema, { id: story.id, deleted: true });
      deleteCount++;
    }
  }
  for (let glMilestone of glMilestones) {
    const story = _.find(stories, (story) => {
      return !!ExternalDataUtils.findLink(story, server, {
        milestone: { id: glMilestone.id }
      });
    });
    if (story) {
      const storyChanges = copyMilestoneProperties(story, system, server, repo, null, glMilestone);
      if (storyChanges) {
        await Story.updateOne(db, schema, storyAfter);
        updateCount++;
      }
    }
  }
  return (deleteCount + updateCount > 0);
}

/**
 * Copy properties of milestone
 *
 * @param  {Story|null} story
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} glMilestone
 *
 * @return {Story}
 */
function copyMilestoneProperties(story, system, server, repo, author, glMilestone) {
  const descriptionTags = findTagsInMarkdown(glMilestone.description);
  const defLangCode = getDefaultLanguageCode(system);

  const storyChanges = _.cloneDeep(story) || {};
  ExternalDataUtils.inheritLink(storyChanges, server, repo, {
    milestone: { id: glMilestone.id }
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'type', {
    value: 'milestone',
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'tags', {
    value: descriptionTags,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'language_codes', {
    value: [ defLangCode ],
    overwrite: 'always',
  });
  if (author) {
    ExternalDataUtils.importProperty(storyChanges, server, 'user_ids', {
      value: [ author.id ],
      overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'role_ids', {
      value: author.role_ids,
      overwrite: 'always',
    });
  }
  ExternalDataUtils.importProperty(storyChanges, server, 'details.title', {
    value: glMilestone.title,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'public', {
    value: true,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'published', {
    value: true,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'ptime', {
    value: Moment(glMilestone.created_at).toISOString(),
    overwrite: 'always',
  });
  if (_.isEqual(storyChanges, story)) {
    return null;
  }
  storyChanges.itime = new String('NOW()');
  return storyChanges;
}

/**
 * Retrieve milestone from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glMilestoneId
 *
 * @return {Promise<Object>}
 */
async function fetchMilestone(server, glProjectId, glMilestoneId) {
  const url = `/projects/${glProjectId}/milestones/${glMilestoneId}`;
  return Transport.fetch(server, url);
}

/**
 * Retrieve milestones from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 *
 * @return {Promise<Array<Object>>}
 */
async function fetchMilestones(server, glProjectId) {
  const url = `/projects/${glProjectId}/milestones`;
  return Transport.fetchAll(server, url);
}

export {
  processEvent,
  updateMilestones,
};
