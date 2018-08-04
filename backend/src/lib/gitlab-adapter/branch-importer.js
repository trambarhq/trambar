var _ = require('lodash');
var Promise = require('bluebird');
var ExternalDataUtils = require('objects/utils/external-data-utils');

// accessors
var Story = require('accessors/story');

module.exports = {
    importEvent,
};

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
function importEvent(db, system, server, repo, project, author, glEvent) {
    // creation of a branch or a tag is handled by PushImporter
    // we only handle deletion events here
    if (glEvent.action_name !== 'deleted') {
        console.log(glEvent);
        return Promise.resolve(null);
    }
    var schema = project.name;
    var branch, tailId, type;
    if (glEvent.push_data) {
        // version 10
        branch = glEvent.push_data.ref;
        type = glEvent.push_data.ref_type;
        tailId = glEvent.push_data.commit_from;
    } else if (glEvent.data) {
        // version 9
        var refParts = _.split(glEvent.data.ref, '/');
        branch = _.last(refParts);
        type = /^tags$/.test(refParts[1]) ? 'tag' : 'branch';
        tailId = glEvent.data.before;
    }
    // look for a story with the commit of the branch's current head
    // we'd not find the story if commits were pushed to the branch after
    // its creation--that's the behavior we want: we want to delete stories
    // that are probably mistakes
    var criteria = {
        type: type,
        external_object: ExternalDataUtils.extendLink(server, repo, {
            commit: { ids: [ tailId ] }
        })
    };
    return Story.find(db, schema, criteria, 'id, details').each((story) => {
        if (story.details.branch === branch) {
            // delete the story if no changes were checked in with the branch
            if (_.isEmpty(story.details.files)) {
                story.deleted = true;
                return Story.updateOne(db, schema, story);
            }
        }
    }).return(null);
}
