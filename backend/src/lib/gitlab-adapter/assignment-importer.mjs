import _ from 'lodash';
import Moment from 'moment';
import { inheritLink, importProperty } from '../external-data-utils.mjs';

import * as Transport from './transport.mjs';
import * as UserImporter from './user-importer.mjs';

// accessors
import { Reaction } from '../accessors/reaction.mjs';

/**
- * Add assignment reactions to story
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Project} project
 * @param  {Repo} repo
 * @param  {Story} story
 * @param  {Array<Object>} assignments
 *
 * @return {Promise<Array<Reaction>>}
 */
async function importAssignments(db, server, project, repo, story, assignments) {
  const schema = project.name;
  // find existing assignments
  const criteria = {
    story_id: story.id,
    type: 'assignment',
  };
  const existingReactions = await Reaction.find(db, schema, criteria, 'user_id');
  const reactionChanges = [];
  for (let assignment of assignments) {
    const reaction = _.find(existingReactions, { user_id: assignment.user.id });
    if (!reaction) {
      const reactionNew = copyAssignmentProperties(null, server, story, assignment);
      reactionChanges.push(reactionNew);
    }
  }
  const reactionsAfter = await Reaction.insert(db, schema, reactionChanges);
  return [ ...existingReactions, ...reactionsAfter ];
}

/**
 * Find assignment to an issue,
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} glIssue
 *
 * @return {Promise<Array<Object>>}
 */
async function findIssueAssignments(db, server, glIssue) {
  const glIssueNumber = glIssue.iid;
  const glProjectID = glIssue.project_id;
  const glNotes = await fetchIssueNotes(server, glProjectID, glIssueNumber);
  return findAssignmentsFromNotes(db, server, glIssue, glNotes);
}

/**
 * Find assignment to an issue,
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} glIssue
 *
 * @return {Promise<Array<Object>>}
 */
async function findMergeRequestAssignments(db, server, glMergeRequest) {
  const glMergeRequestNumber = glMergeRequest.iid;
  const glProjectID = glMergeRequest.project_id;
  const glNotes = await fetchMergeRequestNotes(server, glProjectID, glMergeRequestNumber);
  return findAssignmentsFromNotes(db, server, glMergeRequest, glNotes);
}

/**
 * Find assignments from issue or merge-request notes
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} glObject
 * @param  {Array<Object>} glNotes
 *
 * @return {Promise<Array<Object>>}
 */
async function findAssignmentsFromNotes(db, server, glObject, glNotes) {
  const assignments = [];
  for (let glNote of glNotes) {
    if (glNote.system) {
      // have to rely on the username since the user id isn't provided
      const m1 = /^assigned to @(\S+)/.exec(glNote.body);
      if (m1) {
        if (_.isEmpty(assignments)) {
          const m2 = /unassigned @(\S+)/.exec(glNote.body);
          if (m2) {
            // issue (or merge-request) was created with an assignee
            assignments.push({
              username: m2[1],
              user: null,
              ctime: new Date(glObject.created_at).toISOString()
            });
          }
        }
        assignments.push({
          id: glNote.id,
          username: m1[1],
          user: null,
          ctime: new Date(glNote.created_at).toISOString()
        });
      }

      if (/^moved to/.test(glNote.body)) {
        // the issue has been moved to a different repo
        // it shouldn't be imported
        throw new ObjectMovedError;
      }
    }
  }

  // if an issue (or merge-request) was created with an assignee and
  // no change in assignment has occurred, there would be no notes
  // about assignment change
  //
  // need to look at the current assignees instead
  if (_.isEmpty(assignments)) {
    let assignees = glObject.assignees;
    if (!assignees && glObject.assignee) {
      assignees = [ glObject.assignee ];
    }
    if (assignees) {
      for (let assignee of assignees) {
        assignments.push({
          username: assignee.username,
          user: null,
          ctime: new Date(glObject.created_at).toISOString()
        });
      }
    }
  }

  // find and attach user objects
  const usernames = _.uniq(_.map(assignments, 'username'));
  const users = await UserImporter.findUsersByName(db, server, usernames);
  for (let assignment of assignments) {
    const usernameIndex = _.indexOf(usernames, assignment.username);
    assignment.user = users[usernameIndex];
  }

  // take out the ones whose user cannot be found
  _.remove(assignments, (assignment) => {
    return !assignment.user;
  });
  return assignments;
}

/**
 * Copy certain properties of the issue into the assignment reaction
 *
 * @param  {Reaction|null} reaction
 * @param  {Server} server
 * @param  {Story} story
 * @param  {Object} assignment
 *
 * @return {Reaction}
 */
function copyAssignmentProperties(reaction, server, story, assignment) {
  const reactionChanges = _.cloneDeep(reaction) || {};
  inheritLink(reactionChanges, server, story, {
    note: { id: assignment.id }
  });
  importProperty(reactionChanges, server, 'type', {
    value: 'assignment',
    overwrite: 'always',
  });
  importProperty(reactionChanges, server, 'story_id', {
    value: story.id,
    overwrite: 'always',
  });
  importProperty(reactionChanges, server, 'user_id', {
    value: assignment.user.id,
    overwrite: 'always',
  });
  importProperty(reactionChanges, server, 'public', {
    value: true,
    overwrite: 'always',
  });
  importProperty(reactionChanges, server, 'published', {
    value: true,
    overwrite: 'always',
  });
  importProperty(reactionChanges, server, 'ptime', {
    value: assignment.ctime,
    overwrite: 'always',
  });
  if (_.isEqual(reactionChanges, reaction)) {
    return null;
  }
  reactionChanges.itime = new String('NOW()');
  return reactionChanges;
}

/**
 * Retrieve system notes from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 * @param  {Number} glIssueID
 *
 * @return {Object}
 */
async function fetchIssueNotes(server, glProjectID, glIssueNumber) {
  const url = `/projects/${glProjectID}/issues/${glIssueNumber}/notes`;
  return Transport.fetch(server, url);
}

/**
 * Retrieve system notes from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 * @param  {Number} glMergeRequestNumber
 *
 * @return {Object}
 */
async function fetchMergeRequestNotes(server, glProjectID, glMergeRequestNumber) {
  const url = `/projects/${glProjectID}/merge_requests/${glMergeRequestNumber}/notes`;
  return Transport.fetch(server, url);
}

class ObjectMovedError extends Error {
  constructor() {
    super();
    this.message = 'Object moved';
  }
}

export {
  importAssignments,
  findIssueAssignments,
  findMergeRequestAssignments,

  ObjectMovedError,
};
