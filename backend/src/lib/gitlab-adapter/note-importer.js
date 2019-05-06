import _ from 'lodash';
import Moment from 'moment';
import Crypto from 'crypto';
import * as TaskLog from 'task-log';
import * as Localization from 'localization';
import HTTPError from 'errors/http-error';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

import * as Transport from 'gitlab-adapter/transport';
import * as UserImporter from 'gitlab-adapter/user-importer';

import Commit from 'accessors/commit';
import Story from 'accessors/story';
import Reaction from 'accessors/reaction';

/**
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 * @param  {Object} glHookEvent
 *
 * @return {Promise<Story|null>}
 */
async function importEvent(db, system, server, repo, project, author, glEvent, glHookEvent) {
    switch (_.toLower(glEvent.note.noteable_type)) {
        case 'issue':
            return importIssueNote(db, system, server, repo, project, author, glEvent);
        case 'mergerequest':
        case 'merge_request':
            return importMergeRequestNote(db, system, server, repo, project, author, glEvent);
        case 'commit':
            return importCommitNote(db, system, server, repo, project, author, glEvent, glHookEvent);
        default:
            return null;
    }
}

/**
 * Add note to an issue story
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story|null>}
 */
async function importIssueNote(db, system, server, repo, project, author, glEvent) {
    let schema = project.name;
    let criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            issue: { id: glEvent.note.noteable_id }
        })
    };
    let story = await Story.findOne(db, schema, criteria, '*');
    if (!story) {
        console.log('Story not found');
        return null;
    }
    let reactioNew = copyEventProperties(null, system, server, story, author, glEvent);
    await Reaction.insertOne(db, schema, reactioNew);
    return story;
}

/**
 * Add note to an merge-request story
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story|null>}
 */
async function importMergeRequestNote(db, system, server, repo, project, author, glEvent) {
    let schema = project.name;
    let criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            merge_request: { id: glEvent.note.noteable_id }
        })
    };
    let story = await Story.findOne(db, schema, criteria, '*');
    if (!story) {
        throw new HTTPError(404, 'Story not found');
    }
    let reactioNew = copyEventProperties(null, system, server, story, author, glEvent);
    await Reaction.insertOne(db, schema, reactioNew);
    return story;
}

/**
 * Add note to a push story
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glEvent
 * @param  {Object} glHookEvent
 *
 * @return {Promise<Story|null>}
 */
async function importCommitNote(db, system, server, repo, project, author, glEvent, glHookEvent) {
    // need to find the commit id first, since Gitlab doesn't include it
    // in the activity log entry
    let commitID = await findCommitID(db, server, repo, glEvent, glHookEvent);
    if (!commitID) {
        throw new HTTPError(404, 'Commit not found');
    }
    let schema = project.name;
    let criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            commit: { id: commitID }
        })
    };
    let story = await Story.findOne(db, schema, criteria, '*');
    if (!story) {
        throw new HTTPError(404, 'Story not found');
    }
    let reactioNew = copyEventProperties(null, system, server, story, author, glEvent);
    await Reaction.insertOne(db, schema, reactioNew);
    return story;
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
 * @return {Promise<String|undefined>}
 */
async function findCommitID(db, server, repo, glEvent, glHookEvent) {
    if (glHookEvent) {
        // the object sent through the hook has the commit id
        // we can use that when we're responding to a call from Gitlab
        if (glHookEvent.object_attributes.id === glEvent.note.id) {
            let commitID = glHookEvent.object_attributes.commit_id;
            return commitID;
        }
    }

    let criteria = {
        title_hash: hash(glEvent.target_title),
        external_object: ExternalDataUtils.findLink(repo, server),
    };
    let commits = await Commit.find(db, 'global', criteria, '*');
    for (let commit of commits) {
        let commitLink = ExternalDataUtils.findLink(commit, server);
        let commitID = commitLink.commit.id;
        let projectID = commitLink.project.id;
        let glNotes = await fetchCommitNotes(server, projectID, commitID);
        let found = _.some(glNotes, (glNote) => {
            if (glNote.note === glEvent.note.body) {
                return true;
            }
        });
        if (found) {
            return commitID;
        }
    }
}

/**
 * Copy certain properties of event into reaction
 *
 * @param  {Reaction|null} reaction
 * @param  {System} system
 * @param  {Server} server
 * @param  {Story} story
 * @param  {User} author
 * @param  {Object} glNote
 * @param  {Object} link
 *
 * @return {Reaction}
 */
function copyEventProperties(reaction, system, server, story, author, glNote) {
    let defLangCode = Localization.getDefaultLanguageCode(system);
    let reactionAfter = _.cloneDeep(reaction) || {};
    ExternalDataUtils.inheritLink(reactionAfter, server, story, {
        note: { id: _.get(glNote, 'note.id') }
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'type', {
        value: 'note',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'story_id', {
        value: story.id,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'user_id', {
        value: author.id,
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
        value: Moment(glNote.created_at).toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(reactionAfter, reaction)) {
        return reaction;
    }
    reactionAfter.itime = new String('NOW()');
    return reactionAfter;
}

/**
 * Retrieve merge request notes from Gitlab server
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 * @param  {String} glCommitID
 * @param  {String} glObjectType
 *
 * @return {Promise<Array<Object>>}
 */
async function fetchCommitNotes(server, glProjectID, glCommitID) {
    let url = `/projects/${glProjectID}/repository/commits/${glCommitID}/comments`;
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
    let hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}

export {
    importEvent,
};
