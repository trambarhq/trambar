var _ = require('lodash');

var Story = require('accessors/story');
var Reaction = require('accessors/reaction');

exports.importComments = importComments;

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
    var schema = project.name;
    var criteria = {
        commit_id: commit.id,
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
        return fetchAll(server, url).then((notes) => {
            var changes = [];
            var nonSystemNotes = _.filter(notes, (note) => {
                return !note.system;
            });
            var accountIds = _.map(nonSystemNotes, (note) => {
                return note.author.id;
            });
            return findUsers(db, server, accountIds).then((users) => {
                _.each(nonSystemNotes, (note, index) => {
                    // commit comments don't have ids for some reason
                    var reaction = (note.id)
                        ? _.find(reactions, { external_id: note.id })
                        : reactions[index];
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
