import _ from 'lodash';
import Moment from 'moment';
import Crypto from 'crypto';
import * as TaskLog from '../task-log.mjs';
import * as Localization from '../localization.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as Transport from './transport.mjs';
import * as UserImporter from './user-importer.mjs';

import Commit from '../accessors/commit.mjs';
import Story from '../accessors/story.mjs';
import Reaction from '../accessors/reaction.mjs';

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
 * @return {Promise<Boolean>}
 */
async function processEvent(db, system, server, repo, project, author, glEvent, glHookEvent) {
    switch (_.toLower(glEvent.note.noteable_type)) {
        case 'issue':
            return processIssueNoteEvent(db, system, server, repo, project, author, glEvent);
        case 'mergerequest':
        case 'merge_request':
            return processMergeRequestNoteEvent(db, system, server, repo, project, author, glEvent);
        case 'commit':
            return processCommitNoteEvent(db, system, server, repo, project, author, glEvent, glHookEvent);
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
 * @return {Promise<Boolean>}
 */
async function processIssueNoteEvent(db, system, server, repo, project, author, glEvent) {
    const schema = project.name;
    const criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            issue: { id: glEvent.note.noteable_id }
        })
    };
    const story = await Story.findOne(db, schema, criteria, '*');
    if (!story) {
        return false;
    }
    const reactionNew = copyEventProperties(null, system, server, story, author, glEvent);
    await Reaction.insertOne(db, schema, reactionNew);
    return true;
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
 * @return {Promise<Boolean>}
 */
async function processMergeRequestNoteEvent(db, system, server, repo, project, author, glEvent) {
    const schema = project.name;
    const criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            merge_request: { id: glEvent.note.noteable_id }
        })
    };
    const story = await Story.findOne(db, schema, criteria, '*');
    if (!story) {
        return false;
    }
    const reactionNew = copyEventProperties(null, system, server, story, author, glEvent);
    await Reaction.insertOne(db, schema, reactionNew);
    return true;
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
 * @return {Promise<Boolean>}
 */
async function processCommitNoteEvent(db, system, server, repo, project, author, glEvent, glHookEvent) {
    // need to find the commit id first, since Gitlab doesn't include it
    // in the activity log entry
    const commitID = await findCommitID(db, server, repo, glEvent, glHookEvent);
    if (!commitID) {
        return false;
    }
    const schema = project.name;
    const criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            commit: { id: commitID }
        })
    };
    const story = await Story.findOne(db, schema, criteria, '*');
    if (!story) {
        return false;
    }
    const reactionNew = copyEventProperties(null, system, server, story, author, glEvent);
    await Reaction.insertOne(db, schema, reactionNew);
    return false;
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
            const commitID = glHookEvent.object_attributes.commit_id;
            return commitID;
        }
    }

    const criteria = {
        title_hash: hash(glEvent.target_title),
        external_object: ExternalDataUtils.findLink(repo, server),
    };
    const commits = await Commit.find(db, 'global', criteria, '*');
    for (let commit of commits) {
        const commitLink = ExternalDataUtils.findLink(commit, server);
        const commitID = commitLink.commit.id;
        const projectID = commitLink.project.id;
        const glNotes = await fetchCommitNotes(server, projectID, commitID);
        const found = _.some(glNotes, (glNote) => {
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
    const defLangCode = Localization.getDefaultLanguageCode(system);
    const reactionChanges = _.cloneDeep(reaction) || {};
    ExternalDataUtils.inheritLink(reactionChanges, server, story, {
        note: { id: _.get(glNote, 'note.id') }
    });
    ExternalDataUtils.importProperty(reactionChanges, server, 'type', {
        value: 'note',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionChanges, server, 'story_id', {
        value: story.id,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionChanges, server, 'user_id', {
        value: author.id,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionChanges, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionChanges, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionChanges, server, 'ptime', {
        value: Moment(glNote.created_at).toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(reactionChanges, reaction)) {
        return null;
    }
    reactionChanges.itime = new String('NOW()');
    return reactionChanges;
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
    const url = `/projects/${glProjectID}/repository/commits/${glCommitID}/comments`;
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
    const hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}

export {
    processEvent,
};
