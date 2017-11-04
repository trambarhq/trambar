var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

var Transport = require('gitlab-adapter/transport');
var Import = require('gitlab-adapter/import');
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
 * @param  {Project} project
 * @param  {Story} story
 *
 * @return {Promise<Array<Reaction>>}
 */
function importComments(db, server, project, story) {
    switch (story.type) {
        case 'issue':
            return importIssueComments(db, server, project, story);
        case 'merge_request':
            return importMergeRequestComments(db, server, project, story);
        case 'push':
        case 'merge':
        case 'branch':
            return importPushComments(db, server, project, story);
    }
}

/**
 * Import comments attached to a merge request
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Project} project
 * @param  {Story} story
 *
 * @return {Promise<Array<Object>>}
 */
function importIssueComments(db, server, project, story) {
    var schema = project.name;
    var storyLink = Import.Link.find(story, server);
    var issueLink = Import.Link.pick(storyLink, 'issue');
    var criteria = {
        type: 'note',
        story_id: story.id,
        external_object: issueLink
    };
    return Reaction.find(db, schema, criteria, '*').then((reactions) => {
        return fetchIssueNotes(server, storyLink.project.id, storyLink.issue.id).mapSeries((glNote) => {
            var noteLink = Import.Link.create(server, { note: { id: glNote.id } });
            var reaction = _.find(reactions, noteLink);
            if (reaction) {
                return reaction;
            }
            return UserImporter.importUser(db, server, glNote.author).then((author) => {
                var link = Import.Link.merge(noteLink, storyLink);
                var reactioNew = copyNoteProperties(reaction, story, author, glNote, link);
                return Reaction.insertOne(db, schema, reactioNew);
            });
        });
    });
}

/**
 * Import comments attached to a merge request
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Project} project
 * @param  {Story} story
 *
 * @return {Promise<Array<Reaction>>}
 */
function importMergeRequestComments(db, server, project, story) {
    var schema = project.name;
    var storyLink = Import.Link.find(story, server);
    var mergeRequestLink = Import.Link.pick(storyLink, 'merge_request');
    var criteria = {
        type: 'note',
        story_id: story.id,
        external_object: mergeRequestLink
    };
    return Reaction.find(db, schema, criteria, '*').then((reactions) => {
        return fetchMergeRequestNotes(server, storyLink.project.id, storyLink.merge_request.id).mapSeries((glNote) => {
            var noteLink = Import.Link.create(server, { note: { id: glNote.id } });
            var reaction = _.find(reactions, noteLink);
            if (reaction) {
                return reaction;
            }
            return UserImporter.importUser(db, server, glNote.author).then((author) => {
                var link = Import.Link.merge(noteLink, storyLink);
                var reactioNew = copyNoteProperties(reaction, story, author, glNote, link);
                return Reaction.insertOne(db, schema, reactioNew);
            });
        });
    });
}

/**
 * Import comments attached to a merge request
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Project} project
 * @param  {Story} story
 *
 * @return {Promise<Array<Reaction>>}
 */
function importPushComments(db, server, project, story) {
    var schema = project.name;
    var storyLink = Import.Link.find(story, server);
    var commitsLink = Import.Link.pick(storyLink, 'commit');
    var criteria = {
        type: 'note',
        story_id: story.id,
        external_object: commitsLink
    };
    return Reaction.find(db, schema, criteria, '*').then((reactions) => {
        return Promise.mapSeries(storyLink.commit.ids, (commitId) => {
            return fetchCommitNotes(server, storyLink.project.id, commitId).mapSeries((glNote) => {
                // Gitlab doesn't no note id in commit notes for some reason
                var noteLink = Import.Link.create(server, { note: { id: glNote.created_at } });
                var reaction = _.find(reactions, noteLink);
                if (reaction) {
                    return reaction;
                }
                return UserImporter.importUser(db, server, glNote.author).then((author) => {
                    var link = Import.Link.merge(noteLink, storyLink);
                    link.commit = { id: commitId };
                    var reactioNew = copyNoteProperties(reaction, story, author, glNote, link);
                    return Reaction.insertOne(db, schema, reactioNew);
                });
            });
        });
    });
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
