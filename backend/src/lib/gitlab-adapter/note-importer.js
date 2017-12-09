var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Crypto = require('crypto');

var Import = require('external-services/import');
var TaskLog = require('external-services/task-log');
var Transport = require('gitlab-adapter/transport');
var UserImporter = require('gitlab-adapter/user-importer');

var Commit = require('accessors/commit');
var Story = require('accessors/story');
var Reaction = require('accessors/reaction');

exports.importEvent = importEvent;
exports.importHookEvent = importHookEvent;

/**
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story|null>}
 */
function importEvent(db, server, repo, project, author, glEvent) {
    switch (_.toLower(glEvent.note.noteable_type)) {
        case 'issue':
            return importIssueNote(db, server, repo, project, author, glEvent);
        case 'merge_request':
            //return importMergeRequestNote(db, server, repo, project, author, glEvent);
        case 'commit':
            return importCommitNote(db, server, repo, project, author, glEvent);
        default:
            return Promise.resolve(null);
    }
}

/**
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glHookEvent
 *
 * @return {Promise}
 */
function importHookEvent(db, server, repo, project, glHookEvent) {
    return Promise.resolve(false);
}

/**
 * Add note to an issue story
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story|null>}
 */
function importIssueNote(db, server, repo, project, author, glEvent) {
    var schema = project.name;
    var repoLink = Import.Link.find(repo, server);
    var issueLink = Import.Link.create(server, {
        issue: { id: glEvent.note.noteable_id }
    }, repoLink);
    var criteria = {
        type: 'issue',
        external_object: issueLink
    };
    return Story.findOne(db, schema, criteria, '*').then((story) => {
        if (!story) {
            return null;
        }
        var noteLink = Import.Link.create(server, {
            note: { id: glEvent.note.id },
        }, issueLink);
        var reactioNew = copyEventProperties(null, story, author, glEvent, noteLink);
        return Reaction.insertOne(db, schema, reactioNew).return(story);
    });
}

/**
 * Add note to a push story
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glEvent
 *
 * @return {Promise<Story|null>}
 */
function importCommitNote(db, server, repo, project, author, glEvent) {
    // need to find the commit id first, since Gitlab doesn't include it
    // in the activity log entry
    return findCommitId(db, server, repo, glEvent).then((commitId) => {
        if (!commitId) {
            return null;
        }
        var schema = project.name;
        var repoLink = Import.Link.find(repo, server);
        var commitLink = Import.Link.create(server, {
            commit: { id: commitId }
        }, repoLink);
        var criteria = {
            type: 'push',
            external_object: commitLink
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            if (!story) {
                return null;
            }
            var noteLink = Import.Link.create(server, {
                note: { id: glEvent.note.id },
            }, commitLink);
            var reactioNew = copyEventProperties(null, story, author, glEvent, noteLink);
            return Reaction.insertOne(db, schema, reactioNew).return(story);
        });
    });
}

function findCommitId(db, server, repo, glEvent) {
    var titleHash = hash(glEvent.target_title);
    var repoLink = Import.Link.find(repo, server);
    console.log(glEvent);
    var criteria = {
        title_hash: hash(glEvent.target_title),
        external_object: repoLink,
    };
    return Commit.find(db, 'global', criteria, '*').then((commits) => {
        return Promise.reduce(commits, (match, commit) => {
            if (match) {
                return match;
            }
            var link = Import.Link.find(commit, server);
            var commitId = link.commit.id;
            var projectId = link.project.id;
            return fetchCommitNotes(server, projectId, commitId).then((glNotes) => {
                var found = _.some(glNotes, (glNote) => {
                    if (glNote.note === glEvent.note.body) {
                        return true;
                    }
                });
                return (found) ? commitId : null;
            });
        }, null);
    });
}

/**
 * Copy certain properties of event into reaction
 *
 * @param  {Reaction|null} reaction
 * @param  {Story} story
 * @param  {User} author
 * @param  {Object} glNote
 * @param  {Object} link
 *
 * @return {Reaction|null}
 */
function copyEventProperties(reaction, story, author, glEvent, link) {
    var reactionAfter = _.cloneDeep(reaction) || {};
    Import.join(reactionAfter, link);
    _.set(reactionAfter, 'type', 'note');
    _.set(reactionAfter, 'story_id', story.id);
    _.set(reactionAfter, 'user_id', author.id);
    _.set(reactionAfter, 'public', story.public);
    _.set(reactionAfter, 'published', true);
    _.set(reactionAfter, 'ptime', Moment(glEvent.created_at).toISOString());
    if (_.isEqual(reaction, reactionAfter)) {
        return null;
    }
    return reactionAfter;
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

/**
 * Generate MD5 hash of text
 *
 * @param  {String} text
 *
 * @return {String}
 */
function hash(text) {
    var hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}
