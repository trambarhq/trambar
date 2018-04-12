var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var ExternalDataUtils = require('objects/utils/external-data-utils');

var Transport = require('gitlab-adapter/transport');
var UserImporter = require('gitlab-adapter/user-importer');

// accessors
var Reaction = require('accessors/reaction');

module.exports = {
    findIssueAssignments,
    findMergeRequestAssignments,
    importAssignments,

    ObjectMovedError,
};

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
function importAssignments(db, server, project, repo, story, assignments) {
    var schema = project.name;
    // find existing assignments
    var criteria = {
        story_id: story.id,
        type: 'assignment',
    };
    return Reaction.find(db, schema, criteria, 'user_id').then((existingReactions) => {
        var reactions = [];
        _.each(assignments, (assignment) => {
            if (!_.some(existingReactions, { user_id: assignment.user.id })) {
                var reactionNew = copyAssignmentProperties(null, server, story, assignment);
                reactions.push(reactionNew);
            }
        });
        return Reaction.save(db, schema, reactions);
    });
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
function findIssueAssignments(db, server, glIssue) {
    var glIssueNumber = glIssue.iid;
    var glProjectId = glIssue.project_id;
    return fetchIssueNotes(server, glProjectId, glIssueNumber).then((glNotes) => {
        return findAssignmentsFromNotes(db, server, glIssue, glNotes);
    });
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
function findMergeRequestAssignments(db, server, glMergeRequest) {
    var glMergeRequestNumber = glMergeRequest.iid;
    var glProjectId = glMergeRequest.project_id;
    return fetchMergeRequestNotes(server, glProjectId, glMergeRequestNumber).then((glNotes) => {
        return findAssignmentsFromNotes(db, server, glMergeRequest, glNotes);
    });
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
function findAssignmentsFromNotes(db, server, glObject, glNotes) {
    var assignments = [];
    _.each(glNotes, (glNote) => {
        if (glNote.system) {
            // have to rely on the username since the user id isn't provided
            var m1 = /^assigned to @(\S+)/.exec(glNote.body);
            if (m1) {
                if (_.isEmpty(assignments)) {
                    var m2 = /unassigned @(\S+)/.exec(glNote.body);
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
    });

    // if an issue (or merge-request) was created with an assignee and
    // no change in assignment has occurred, there would be no notes
    // about assignment change
    //
    // need to look at the current assignees instead
    if (_.isEmpty(assignments)) {
        var assignees = glObject.assignees;
        if (!assignees && glObject.assignee) {
            assignees = [ glObject.assignee ];
        }
        _.each(assignees, (assignee) => {
            assignments.push({
                username: assignee.username,
                user: null,
                ctime: new Date(glObject.created_at).toISOString()
            });
        });
    }

    // find and attach user objects
    var usernames = _.uniq(_.map(assignments, 'username'));
    return UserImporter.findUsersByName(db, server, usernames).then((users) => {
        _.each(assignments, (assignment) => {
            var usernameIndex = _.indexOf(usernames, assignment.username);
            assignment.user = users[usernameIndex];
        });

        // take out the ones whose user cannot be found
        _.remove(assignments, (assignment) => {
            return !assignment.user;
        })
        return assignments;
    });
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
    var reactionAfter = _.cloneDeep(reaction) || {};
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
 * @param  {Number} glProjectId
 * @param  {Number} glIssueId
 *
 * @return {Object}
 */
function fetchIssueNotes(server, glProjectId, glIssueNumber) {
    var url = `/projects/${glProjectId}/issues/${glIssueNumber}/notes`;
    return Transport.fetch(server, url);
}

/**
 * Retrieve system notes from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glMergeRequestNumber
 *
 * @return {Object}
 */
function fetchMergeRequestNotes(server, glProjectId, glMergeRequestNumber) {
    var url = `/projects/${glProjectId}/merge_requests/${glMergeRequestNumber}/notes`;
    return Transport.fetch(server, url);
}

function ObjectMovedError() {
    this.message = 'Object moved';
};

ObjectMovedError.prototype = Object.create(Error.prototype)
