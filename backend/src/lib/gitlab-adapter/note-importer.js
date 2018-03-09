var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Crypto = require('crypto');
var TaskLog = require('task-log');
var ExternalObjectUtils = require('objects/utils/external-object-utils');

var Transport = require('gitlab-adapter/transport');
var UserImporter = require('gitlab-adapter/user-importer');

var Commit = require('accessors/commit');
var Story = require('accessors/story');
var Reaction = require('accessors/reaction');

module.exports = {
    importEvent,
};

/**
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 * @param  {Object} glHookEvent
 *
 * @return {Promise<Story|null>}
 */
function importEvent(db, server, repo, project, author, glEvent, glHookEvent) {
    switch (_.toLower(glEvent.note.noteable_type)) {
        case 'issue':
            return importIssueNote(db, server, repo, project, author, glEvent);
        case 'mergerequest':
        case 'merge_request':
            return importMergeRequestNote(db, server, repo, project, author, glEvent);
        case 'commit':
            return importCommitNote(db, server, repo, project, author, glEvent, glHookEvent);
        default:
            return Promise.resolve(null);
    }
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
    var criteria = {
        external_object: ExternalObjectUtils.extend(server, repo, {
            issue: { id: glEvent.note.noteable_id }
        })
    };
    return Story.findOne(db, schema, criteria, '*').then((story) => {
        if (!story) {
            throw new Error('Story not found');
        }
        var reactioNew = copyEventProperties(null, server, story, author, glEvent);
        return Reaction.insertOne(db, schema, reactioNew).return(story);
    }).catch((err) => {
        console.error(err);
        return null;
    });
}

/**
 * Add note to an merge-request story
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
function importMergeRequestNote(db, server, repo, project, author, glEvent) {
    var schema = project.name;
    var criteria = {
        external_object: ExternalObjectUtils.extend(server, repo, {
            merge_request: { id: glEvent.note.noteable_id }
        })
    };
    return Story.findOne(db, schema, criteria, '*').then((story) => {
        if (!story) {
            throw new Error('Story not found');
        }
        var reactioNew = copyEventProperties(null, server, story, author, glEvent);
        return Reaction.insertOne(db, schema, reactioNew).return(story);
    }).catch((err) => {
        console.error(err);
        return null;
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
 * @param  {Object} glHookEvent
 *
 * @return {Promise<Story|null>}
 */
function importCommitNote(db, server, repo, project, author, glEvent, glHookEvent) {
    // need to find the commit id first, since Gitlab doesn't include it
    // in the activity log entry
    return findCommitId(db, server, repo, glEvent, glHookEvent).then((commitId) => {
        if (!commitId) {
            throw new Error('Commit not found');
        }
        var schema = project.name;
        var criteria = {
            external_object: ExternalObjectUtils.extendLink(server, repo, {
                commit: { id: commitId }
            })
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            if (!story) {
                throw new Error('Story not found');
            }
            var reactioNew = copyEventProperties(null, server, story, author, glEvent);
            return Reaction.insertOne(db, schema, reactioNew).return(story);
        });
    }).catch((err) => {
        console.error(err);
        return null;
    });
}

/**
 * Look for the id of the commit that the note is on
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} glEvent
 * @param  {Object} glHookEvent
 *
 * @return {Promise<String>}
 */
function findCommitId(db, server, repo, glEvent, glHookEvent) {
    if (glHookEvent) {
        // the object sent through the hook has the commit id
        // we can use that when we're responding to a call from Gitlab
        if (glHookEvent.object_attributes.id === glEvent.note.id) {
            var commitId = glHookEvent.object_attributes.commit_id;
            return Promise.resolve(commitId);
        }
    }

    var criteria = {
        title_hash: hash(glEvent.target_title),
        external_object: ExternalObjectUtils.findLink(repo, server),
    };
    return Commit.find(db, 'global', criteria, '*').then((commits) => {
        return Promise.reduce(commits, (match, commit) => {
            if (match) {
                return match;
            }
            var commitLink = ExternalObjectUtils.findLink(commit, server);
            var commitId = commitLink.commit.id;
            var projectId = commitLink.project.id;
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
 * @param  {Server} server
 * @param  {Story} story
 * @param  {User} author
 * @param  {Object} glNote
 * @param  {Object} link
 *
 * @return {Reaction|null}
 */
function copyEventProperties(reaction, server, story, author, glNote) {
    var reactionAfter = _.cloneDeep(reaction) || {};
    var noteLink = {
        id: glNote.id
    };
    ExternalObjectUtils.inheritLink(reactionAfter, server, story, {
        note: noteLink
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'type', {
        value: 'note',
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'story_id', {
        value: story.id,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'user_id', {
        value: author.id,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'ptime', {
        value: Moment(glNote.created_at).toISOString(),
        overwrite: 'always',
    });
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
