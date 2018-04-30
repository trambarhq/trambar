var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var ExternalDataUtils = require('objects/utils/external-data-utils');

// accessors
var Story = require('accessors/story');
var User = require('accessors/user');

module.exports = {
    importHookEvent,
};

/**
 * Import a wiki related event
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glHookEvent
 *
 * @return {Promise<Story|null>}
 */
function importHookEvent(db, server, repo, project, author, glHookEvent) {
    var schema = project.name;
    // see if there's story about this page recently
    var criteria = {
        newer_than: Moment().subtract(1, 'day').toISOString(),
        external_object: ExternalDataUtils.extendLink(server, repo, {
            wiki: { id: glHookEvent.object_attributes.slug }
        }),
    };
    return Story.findOne(db, schema, criteria, 'id').then((recentStory) => {
        if (recentStory) {
            if (glHookEvent.object_attributes.action === 'delete') {
                // remove the story if the page is no longer there
                var columns = {
                    id: recentStory.id,
                    deleted: true,
                };
                return Story.updateOne(db, schema, columns).return(null);
            } else {
                // ignore, as one story a day about a page is enough
                return null;
            }
        } else {
            var storyNew = copyEventProperties(null, server, repo, author, glHookEvent);
            return Story.saveOne(db, schema, storyNew);
        }
    });
}

/**
 * Copy properties of event into story
 *
 * @param  {Story|null} story
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} glHookEvent
 *
 * @return {Object|null}
*/
function copyEventProperties(story, server, repo, author, glHookEvent) {
    var storyAfter = _.cloneDeep(story) || {};
    ExternalDataUtils.inheritLink(storyAfter, server, repo, {
        wiki: { id: glHookEvent.object_attributes.slug }
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: 'wiki',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'user_ids', {
        value: [ author.id ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'role_ids', {
        value: author.role_ids,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.url', {
        value: glHookEvent.object_attributes.url,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.title', {
        value: glHookEvent.object_attributes.title,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.action', {
        value: glHookEvent.object_attributes.action,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.slug', {
        value: glHookEvent.object_attributes.slug,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'ptime', {
        value: Moment().toISOString(),
        overwrite: 'always',
    });
    return storyAfter;
}
