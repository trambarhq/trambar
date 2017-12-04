var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

var Import = require('external-services/import');
var TaskLog = require('external-services/task-log');
var Transport = require('gitlab-adapter/transport');
var UserImporter = require('gitlab-adapter/user-importer');

var Story = require('accessors/story');
var Reaction = require('accessors/reaction');

exports.importCommentEvent = importCommentEvent;
exports.importComments = importComments;

/**
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glEvent
 *
 * @return {Promise}
 */
function importCommentEvent(db, server, repo, project, glEvent) {
    console.log('importCommentEvent');
    console.log(glEvent);
    return Promise.resolve();
}

/**
 * Import comments
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Story} story
 *
 * @return {Promise<Array<Reaction>>}
 */
function importComments(db, server, repo, project, story) {
    switch (story.type) {
        case 'issue':
            return importIssueComments(db, server, repo, project, story);
        case 'merge_request':
            return importMergeRequestComments(db, server, repo, project, story);
        case 'push':
        case 'merge':
        case 'branch':
            return importPushComments(db, server, repo, project, story);
    }
}

/**
 * Import comments attached to a merge request
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Story} story
 *
 * @return {Promise<Array<Object>>}
 */
function importIssueComments(db, server, repo, project, story) {
    var taskLog = TaskLog.start(server, 'gitlab-issue-comment-import', {
        repo: repo.name,
        story_id: story.id,
    });
    var storyLink = Import.Link.find(story, server);
    var issueLink = Import.Link.pick(storyLink, 'issue');
    var schema = project.name;
    var criteria = {
        type: 'note',
        story_id: story.id,
        external_object: issueLink
    };
    return Reaction.find(db, schema, criteria, '*').then((reactions) => {
        var added = [];
        var deleted = [];
        return fetchIssueNotes(server, storyLink.project.id, storyLink.issue.id).then((glNotes) => {
            // delete ones that are no longer there
            return Promise.each(reactions, (reaction) => {
                var noteLink = Import.Link.find(reaction, server);
                if (!_.some(glNotes, { id: noteLink.note.id })) {
                    deleted.push(noteLink.note.id);
                    return Reaction.updateOne(db, schema, { id: reaction.id, deleted: true });
                }
            }).return(glNotes);
        }).mapSeries((glNote, index, count) => {
            var noteLink = Import.Link.create(server, { note: { id: glNote.id } });
            var reaction = _.find(reactions, noteLink);
            if (reaction) {
                return reaction;
            }
            added.push(noteLink.note.id);
            return UserImporter.findUser(db, server, glNote.author).then((author) => {
                var link = Import.Link.merge(noteLink, storyLink);
                var reactioNew = copyNoteProperties(reaction, story, author, glNote, link);
                return Reaction.insertOne(db, schema, reactioNew);
            }).tap(() => {
                taskLog.report(index + 1, count, { added, deleted });
            });
        });
    }).tap(() => {
        taskLog.finish();
    }).tapCatch((err) => {
        taskLog.abort(err);
    });
}

/**
 * Import comments attached to a merge request
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Story} story
 *
 * @return {Promise<Array<Reaction>>}
 */
function importMergeRequestComments(db, server, repo, project, story) {
    var taskLog = TaskLog.start(server, 'gitlab-merge-request-comment-import', {
        repo: repo.name,
        story_id: story.id,
    });
    var schema = project.name;
    var storyLink = Import.Link.find(story, server);
    var mergeRequestLink = Import.Link.pick(storyLink, 'merge_request');
    var criteria = {
        type: 'note',
        story_id: story.id,
        external_object: mergeRequestLink
    };
    return Reaction.find(db, schema, criteria, '*').then((reactions) => {
        var added = [];
        var deleted = [];
        return fetchMergeRequestNotes(server, storyLink.project.id, storyLink.merge_request.id).then((glNotes) => {
            // delete ones that are no longer there
            return Promise.each(reactions, (reaction) => {
                var noteLink = Import.Link.find(reaction, server);
                if (!_.some(glNotes, { id: noteLink.note.id })) {
                    deleted.push(noteLink.note.id);
                    return Reaction.updateOne(db, schema, { id: reaction.id, deleted: true });
                }
            }).return(glNotes);
        }).mapSeries((glNote, index, count) => {
            var noteLink = Import.Link.create(server, { note: { id: glNote.id } });
            var reaction = _.find(reactions, noteLink);
            if (reaction) {
                return reaction;
            }
            added.push(noteLink.note.id);
            return UserImporter.findUser(db, server, glNote.author).then((author) => {
                var link = Import.Link.merge(noteLink, storyLink);
                var reactioNew = copyNoteProperties(reaction, story, author, glNote, link);
                return Reaction.insertOne(db, schema, reactioNew);
            }).tap(() => {
                taskLog.report(index + 1, count, { added, deleted });
            });
        });
    }).tap(() => {
        taskLog.finish();
    }).tapCatch((err) => {
        taskLog.abort(err);
    });
}

/**
 * Import comments attached to a merge request
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Story} story
 *
 * @return {Promise<Array<Reaction>>}
 */
function importPushComments(db, server, repo, project, story) {
    var taskLog = TaskLog.start(server, 'gitlab-commit-comment-import', {
        repo: repo.name,
        story_id: story.id,
    });
    var schema = project.name;
    var storyLink = Import.Link.find(story, server);
    var commitsLink = Import.Link.pick(storyLink, 'commit');
    var criteria = {
        type: 'note',
        story_id: story.id,
        external_object: commitsLink
    };
    return Reaction.find(db, schema, criteria, '*').then((reactions) => {
        var added = [];
        var deleted = [];
        return Promise.mapSeries(storyLink.commit.ids, (commitId, commitIndex, commitCount) => {
            return fetchCommitNotes(server, storyLink.project.id, commitId).then((glNotes) => {
                // delete ones that are no longer there
                return Promise.each(reactions, (reaction) => {
                    var noteLink = Import.Link.find(reaction, server);
                    if (noteLink.commit.id === commitId) {
                        if (!_.some(glNotes, { created_at: noteLink.note.id })) {
                            deleted.push(noteLink.note.id);
                            return Reaction.updateOne(db, schema, { id: reaction.id, deleted: true });
                        }
                    }
                }).return(glNotes);
            }).mapSeries((glNote, noteIndex, noteCount) => {
                // Gitlab doesn't no note id in commit notes for some reason
                var noteLink = Import.Link.create(server, { note: { id: glNote.created_at } });
                var reaction = _.find(reactions, noteLink);
                if (reaction) {
                    return reaction;
                }
                added.push(noteLink.note.id);
                return UserImporter.findUser(db, server, glNote.author).then((author) => {
                    var link = Import.Link.merge(noteLink, storyLink);
                    link.commit = { id: commitId };
                    var reactioNew = copyNoteProperties(reaction, story, author, glNote, link);
                    return Reaction.insertOne(db, schema, reactioNew);
                }).tap(() => {
                    if (commitCount === 1) {
                        if (!_.isEmpty(added) || !_.isEmpty(deleted)) {
                            taskLog.report(noteIndex + 1, noteCount, { added, deleted });
                        }
                    }
                });
            }).tap(() => {
                if (commitCount > 1) {
                    if (!_.isEmpty(added) || !_.isEmpty(deleted)) {
                        taskLog.report(commitIndex + 1, commitCount, { added, deleted });
                    }
                }
            });
        });
    }).tap(() => {
        taskLog.finish();
    }).tapCatch((err) => {
        taskLog.abort(err);
    });;
}

/**
 * Copy certain properties of note into reaction
 *
 * @param  {Reaction|null} reaction
 * @param  {Story} story
 * @param  {User} author
 * @param  {Object} glNote
 * @param  {Object} link
 *
 * @return {Reaction|null}
 */
function copyNoteProperties(reaction, story, author, glNote, link) {
    var reactionAfter = _.cloneDeep(reaction) || {};
    Import.join(reactionAfter, link);
    _.set(reactionAfter, 'type', 'note');
    _.set(reactionAfter, 'story_id', story.id);
    _.set(reactionAfter, 'user_id', author.id);
    _.set(reactionAfter, 'public', story.public);
    _.set(reactionAfter, 'published', true);
    _.set(reactionAfter, 'ptime', Moment(glNote.created_at).toISOString());
    if (_.isEqual(reaction, reactionAfter)) {
        return null;
    }
    return reactionAfter;
}

/**
 * Retrieve issue notes from Gitlab server
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glIssueId
 * @param  {String} glObjectType
 *
 * @return {Promise<Array<Object>>}
 */
function fetchIssueNotes(server, glProjectId, glIssueId) {
    var url = `/projects/${glProjectId}/issues/${glIssueId}/notes`;
    return Transport.fetchAll(server, url).filter((note) => {
        // filter out system notes
        return !note.system;
    });
}

/**
 * Retrieve merge request notes from Gitlab server
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glMergeRequestId
 * @param  {String} glObjectType
 *
 * @return {Promise<Array<Object>>}
 */
function fetchMergeRequestNotes(server, glProjectId, glMergeRequestId) {
    var url = `/projects/${glProjectId}/merge_requests/${glMergeRequestId}/notes`;
    return Transport.fetchAll(server, url).filter((note) => {
        return !note.system;
    });
}

/**
 * Retrieve merge request notes from Gitlab server
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {String} glCommitId
 * @param  {String} glObjectType
 *
 * @return {Promise<Array<Object>>}
 */
function fetchCommitNotes(server, glProjectId, glCommitId) {
    var url = `/projects/${glProjectId}/repository/commits/${glCommitId}/comments`;
    return Transport.fetchAll(server, url);
}
