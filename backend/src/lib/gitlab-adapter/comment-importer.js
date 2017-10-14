var _ = require('lodash');
var Moment = require('moment');

var Story = require('accessors/story');
var Reaction = require('accessors/reaction');

var Transport = require('gitlab-adapter/transport');
var UserImporter = require('gitlab-adapter/user-importer');

exports.importComments = importComments;
exports.importCommitComments = importCommitComments;
exports.importIssueComments = importIssueComments;
exports.importMergeRequestComments = importMergeRequestComments;

/**
 * Import comments
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importComments(db, server, repo, event, project) {
    if (event.commit) {
        return importCommitComments(db, server, repo, event.commit, project);
    } else if (msg.issue) {
        return importIssueComments(db, server, repo, event.issue, project);
    } else if (msg.merge_request) {
        return importMergeRequestComments(db, server, repo, event.merge_request, project);
    }
}

/**
 * Import comments attached to commit
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} commit
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importCommitComments(db, server, repo, commit, project) {
    console.log(`Importing comments for ${commit.id}`);
    var schema = project.name;
    var criteria = {
        commit_ids: commit.id,
    };
    return Story.findOne(db, schema, criteria, '*').then((story) => {
        if (!story) {
            return;
        }
        var url = `/projects/${repo.external_id}/repository/commits/${commit.id}/comments`;
        var extra = { commit_id: commit.id };
        return importStoryComments(db, server, url, project, story, extra);
    });
}

/**
 * Import comments attached to an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} issue
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importIssueComments(db, server, repo, issue, project) {
    var schema = project.name;
    var criteria = {
        external_id: issue.id,
    };
    return Story.findOne(db, schema, criteria, '*').then((story) => {
        if (!story) {
            return;
        }
        var url = `/projects/${repo.external_id}/issues/${issue.iid}/notes`;
        return importStoryComments(db, server, url, project, story);
    });
}

/**
 * Import comments attached to a merge request
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} mergeRequest
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importMergeRequestComments(db, server, repo, mergeRequest, project) {
    var schema = project.name;
    var criteria = {
        external_id: mergeRequest.id,
    };
    return Story.findOne(db, schema, criteria, '*').then((story) => {
        if (!story) {
            return;
        }
        var url = `/projects/${repo.external_id}/merge_requests/${mergeRequest.iid}/notes`;
        return importStoryComments(db, server, url, project, story);
    });

}

function importStoryComments(db, server, url, project, story, extra) {
    var schema = project.name;
    var criteria = {
        story_id: story.id,
        repo_id: story.repo_id,
    };
    return Reaction.find(db, schema, criteria, '*').then((reactions) => {
        return Transport.fetchAll(server, url).then((notes) => {
            var changes = [];
            var nonSystemNotes = _.filter(notes, (note) => {
                return !note.system;
            });
            var authors = _.map(nonSystemNotes, 'author');
            return UserImporter.importUsers(db, server, authors).then((users) => {
                _.each(nonSystemNotes, (note, index) => {
                    var reaction;
                    if (note.id) {
                        reaction = _.find(reactions, { external_id: note.id });
                    } else {
                        // commit comments don't have ids for some reason
                        reaction = reactions[index];
                    }
                    var author = _.find(users, { external_id: note.author.id });
                    if (reaction || !author) {
                        return;
                    }
                    reaction = {
                        type: 'note',
                        story_id: story.id,
                        repo_id: story.repo_id,
                        external_id: note.id,
                        user_id: author.id,
                        target_user_ids: story.user_ids,
                        details: extra || {},
                        published: true,
                        ptime: getPublicationTime(note),
                    };
                    changes.push(reaction);
                });
            }).then(() => {
                changes = _.orderBy(changes, [ 'ptime' ], [ 'asc' ]);
                return Reaction.save(db, schema, changes);
            });
        });
    });
}

/**
 * Return time at which event occurred
 *
 * @param  {Object} event
 *
 * @return {String}
 */
function getPublicationTime(event) {
    return Moment(event.created_at).toISOString();
}
