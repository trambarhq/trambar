import _ from 'lodash';
import Moment from 'moment';
import * as Localization from '../localization.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as PushReconstructor from './push-reconstructor.mjs';
import * as PushDecorator from './push-decorator.mjs';
import * as SnapshotManager from './snapshot-manager.mjs';

// accessors
import Story from '../accessors/story.mjs';

/**
 * Import an activity log entry about a push
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
  const schema = project.name;
  let branch, headID, tailID, type, count;
  if (glEvent.push_data) {
    // version 10
    branch = glEvent.push_data.ref;
    type = glEvent.push_data.ref_type;
    headID = glEvent.push_data.commit_to;
    tailID = glEvent.push_data.commit_from;
    count = glEvent.push_data.commit_count;
  } else if (glEvent.data) {
    // version 9
    const refParts = _.split(glEvent.data.ref, '/');
    branch = _.last(refParts);
    type = /^tags$/.test(refParts[1]) ? 'tag' : 'branch';
    headID = glEvent.data.after;
    tailID = glEvent.data.before;
    if (/^0+$/.test(tailID)) {
      // all zeros
      tailID = null;
    }
    count = glEvent.data.total_commits_count;
  }
  // retrieve all commits in the push
  const push = await PushReconstructor.reconstructPush(db, server, repo, type, branch, headID, tailID, count);
  // look for component descriptions
  const languageCode = Localization.getDefaultLanguageCode(system);
  const components = await PushDecorator.retrieveDescriptions(server, repo, push, languageCode);
  const storyNew = copyPushProperties(null, system, server, repo, author, push, components, glEvent);
  await Story.insertOne(db, schema, storyNew);
}

/**
 * Copy properties of push
 *
 * @param  {Story|null} story
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} push
 * @param  {Array<Object>} components
 * @param  {Object} glEvent
 *
 * @return {Story}
 */
function copyPushProperties(story, system, server, repo, author, push, components, glEvent) {
  let storyType;
  let isBranching = false;
  if (!push.tailID) {
    if (glEvent.push_data) {
      // GL 10+
      if (glEvent.push_data.action === 'created') {
        isBranching = true;
      }
    } else if (glEvent.data) {
      // GL 9
      if (glEvent.data.project.default_branch !== push.branch) {
        isBranching = true;
      }
    }
  }
  if (isBranching) {
    storyType = push.type;
  } else if (!_.isEmpty(push.fromBranches)) {
    storyType = 'merge';
  } else {
    storyType = 'push';
  }

  if (repo.template) {
    if (SnapshotManager.containsTemplateFile(push)) {
      storyType = 'snapshot';
    }
  }

  const defLangCode = Localization.getDefaultLanguageCode(system);

  const storyChanges = _.cloneDeep(story) || {};
  ExternalDataUtils.inheritLink(storyChanges, server, repo, {
    commit: { ids: push.commitIDs }
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'type', {
    value: storyType,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'language_codes', {
    value: [ defLangCode ],
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'user_ids', {
    value: [ author.id ],
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'role_ids', {
    value: author.role_ids,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.commit_before', {
    value: push.tailID || undefined,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.commit_after', {
    value: push.headID,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.lines', {
    value: _.pickBy(push.lines),  // don't include 0's
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.files', {
    value: _.pickBy(_.mapValues(push.files, 'length')),
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.components', {
    value: components,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.branch', {
    value: push.branch,
    overwrite: 'always',
  });
  ExternalDataUtils.importProperty(storyChanges, server, 'details.from_branches', {
    value: !_.isEmpty(push.fromBranches) ? push.fromBranches : undefined,
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
    value: Moment(glEvent.created_at).toISOString(),
    overwrite: 'always',
  });
  if (_.isEqual(storyChanges, story)) {
    return null;
  }
  storyChanges.itime = new String('NOW()');
  return storyChanges;
}

export {
  processEvent,
};
