import _ from 'lodash';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

// accessors
import Story from 'accessors/story';

/**
 * Import an activity log entry about a push
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story>}
 */
async function importEvent(db, system, server, repo, project, author, glEvent) {
    // creation of a branch or a tag is handled by PushImporter
    // we only handle deletion events here
    if (glEvent.action_name !== 'deleted') {
        return null;
    }
    let schema = project.name;
    let branch, tailID, type;
    if (glEvent.push_data) {
        // version 10
        branch = glEvent.push_data.ref;
        type = glEvent.push_data.ref_type;
        tailID = glEvent.push_data.commit_from;
    } else if (glEvent.data) {
        // version 9
        let refParts = _.split(glEvent.data.ref, '/');
        branch = _.last(refParts);
        type = /^tags$/.test(refParts[1]) ? 'tag' : 'branch';
        tailID = glEvent.data.before;
    }
    // look for a story with the commit of the branch's current head
    // we'd not find the story if commits were pushed to the branch after
    // its creation--that's the behavior we want: we want to delete stories
    // that are probably mistakes
    let criteria = {
        type: type,
        external_object: ExternalDataUtils.extendLink(server, repo, {
            commit: { ids: [ tailID ] }
        })
    };
    let story = await Story.find(db, schema, criteria, 'id, details');
    if (story.details.branch === branch) {
        // delete the story if no changes were checked in with the branch
        if (_.isEmpty(story.details.files)) {
            story.deleted = true;
            story = await Story.updateOne(db, schema, story);
        }
    }
    return null;
}

export {
    importEvent,
};
