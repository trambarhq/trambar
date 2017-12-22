var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var LinkUtils = require('objects/utils/link-utils');

var Import = require('external-services/import');

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
    var repoLink = LinkUtils.find(repo, { server, relation: 'project' });
    var pageLink = LinkUtils.extend(repoLink, {
        wiki: { id: glHookEvent.object_attributes.slug }
    });
    var criteria = {
        newer_than: Moment().subtract(1, 'day').toISOString(),
        external_object: pageLink,
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
            var storyNew = copyEventProperties(null, author, glHookEvent, pageLink);
            return Story.saveOne(db, schema, storyNew);
        }
    });
}

/**
 * Copy properties of event into story
 *
 * @param  {Story|null} story
 * @param  {User} author
 * @param  {Object} glHookEvent
 * @param  {Object} link
 *
 * @return {Object|null}
*/
function copyEventProperties(story, author, glHookEvent, link) {
    var storyAfter = _.cloneDeep(story) || {};
    Import.join(storyAfter, link);
    _.set(storyAfter, 'type', 'wiki');
    _.set(storyAfter, 'user_ids', [ author.id ]);
    _.set(storyAfter, 'role_ids', author.role_ids);
    _.set(storyAfter, 'published', true);
    _.set(storyAfter, 'ptime', Moment().toISOString());
    _.set(storyAfter, 'public', true);
    _.set(storyAfter, 'details.url', glHookEvent.object_attributes.url);
    _.set(storyAfter, 'details.title', glHookEvent.object_attributes.title);
    _.set(storyAfter, 'details.action', glHookEvent.object_attributes.action);
    _.set(storyAfter, 'details.slug', glHookEvent.object_attributes.slug);
    if (_.isEqual(story, storyAfter)) {
        return null;
    }
    return storyAfter;
}
