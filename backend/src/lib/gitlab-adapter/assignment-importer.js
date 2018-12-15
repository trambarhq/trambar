import _ from 'lodash';
import Moment from 'moment';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

import * as Transport from 'gitlab-adapter/transport';
import * as UserImporter from 'gitlab-adapter/user-importer';

// accessors
import Reaction from 'accessors/reaction';

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
    let schema = project.name;
    // find existing assignments
    let criteria = {
        story_id: story.id,
        type: 'assignment',
    };
    let existingReactions = await Reaction.find(db, schema, criteria, 'user_id');
    let reactionList = [];
    for (let assignment of assignments) {
        let reaction = _.find(existingReactions, { user_id: assignment.user.id });
        if (!reaction) {
            let reactionNew = copyAssignmentProperties(null, server, story, assignment);
            reaction = await Reaction.insertOne(db, schema, reactionNew);
        }
        reactionList.push(reaction);
    }
    return reactionList;
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
    let glIssueNumber = glIssue.iid;
    let glProjectID = glIssue.project_id;
    let glNotes = fetchIssueNotes(server, glProjectID, glIssueNumber);
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
    let glMergeRequestNumber = glMergeRequest.iid;
    let glProjectID = glMergeRequest.project_id;
    let glNotes = fetchMergeRequestNotes(server, glProjectID, glMergeRequestNumber);
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
    let assignments = [];
    for (let glNote of glNotes) {
        if (glNote.system) {
            // have to rely on the username since the user id isn't provided
            let m1 = /^assigned to @(\S+)/.exec(glNote.body);
            if (m1) {
                if (_.isEmpty(assignments)) {
                    let m2 = /unassigned @(\S+)/.exec(glNote.body);
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
        for (let assignee of assignees) {
            assignments.push({
                username: assignee.username,
                user: null,
                ctime: new Date(glObject.created_at).toISOString()
            });
        }
    }

    // find and attach user objects
    let usernames = _.uniq(_.map(assignments, 'username'));
    let users = await UserImporter.findUsersByName(db, server, usernames);
    for (let assignment of assignments) {
        let usernameIndex = _.indexOf(usernames, assignment.username);
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
    let reactionAfter = _.cloneDeep(reaction) || {};
    ExternalDataUtils.inheritLink(reactionAfter, server, story, {
        note: { id: assignment.id }
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'type', {
        value: 'assignment',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'story_id', {
        value: story.id,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'user_id', {
        value: assignment.user.id,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'ptime', {
        value: assignment.ctime,
        overwrite: 'always',
    });
    if (_.isEqual(reactionAfter, reaction)) {
        return reaction;
    }
    reactionAfter.itime = new String('NOW()');
    return reactionAfter;
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
    let url = `/projects/${glProjectID}/issues/${glIssueNumber}/notes`;
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
    let url = `/projects/${glProjectID}/merge_requests/${glMergeRequestNumber}/notes`;
    return Transport.fetch(server, url);
}

class ObjectMovedError extends Error {
    constructor() {
        this.message = 'Object moved';
    }
}

export {
    findIssueAssignments,
    findMergeRequestAssignments,
    importAssignments,

    ObjectMovedError,
};
