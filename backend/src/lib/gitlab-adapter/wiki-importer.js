var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

var Import = require('gitlab-adapter/import');

// accessors
var Story = require('accessors/story');
var User = require('accessors/user');

exports.importEvent;

/**
 * Import a wiki related event
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glEvent
 *
 * @return {Promise<Story|null>}
 */
function importEvent(db, server, repo, project, glEvent) {
    var schema = project.name;
    // the user id for some reason isn't included in the message, only the user name
    var criteria = {
        username: glEvent.user.username,
        external_object: {
            type: 'gitlab',
            server_id: server.id,
        }
    };
    return User.findOne(db, 'global', criteria, 'id, role_ids').then((author) => {
        if (!author) {
            return null;
        }
        // see if there's story about this page recently
        var repoLink = Import.Link.find(repo, server);
        var pageLink = Import.Link.create(server, {
            wiki: { id: glEvent.object_attributes.slug }
        };
        var link = Import.Link.merge(pageLink, repoLink);
        var criteria = {
            type: 'wiki',
            newer_than: Moment().subtract(1, 'day').toISOString(),
            external_object: link,
        };
        return Story.findOne(db, schema, criteria, 'id').then((recentStory) => {
            if (recentStory) {
                if (glEvent.object_attributes.action === 'delete') {
                    // remove the story if the page is no longer there
                    recentStory.deleted = true;
                    return Story.saveOne(db, schema, recentStory).return(null);
                } else {
                    // ignore, as one story a day about a page is enough
                    return null;
                }
            } else {
                var storyNew = copyEventProperties(null, glEvent, link);
                return Story.saveOne(db, schema, storyNew);
            }
        });
    });
}

/**
 * Copy properties of event into story
 *
 * @param  {Story|null} story
 * @param  {Object} glEvent
 * @param  {Object} link
 *
 * @return {Object|null}
*/
function copyEventProperties(story, glEvent, link) {
    var storyAfter = _.cloneDeep(story) || {};
    Import.join(storyAfter, link);
    var attrs = glEvent.object_attributes;
    _.set(storyAfter, 'type', 'wiki');
    _.set(storyAfter, 'user_ids', 'wiki');
    _.set(storyAfter, 'role_ids', 'wiki');
    _.set(storyAfter, 'public', true);
    _.set(storyAfter, 'published', true);
    _.set(storyAfter, 'ptime', Moment().toISOString());
    _.set(storyAfter, 'details.url', attrs.url);
    _.set(storyAfter, 'details.title', attrs.title);
    _.set(storyAfter, 'details.action', attrs.action);
    _.set(storyAfter, 'details.slug', attrs.slug);
    if (_.isEqual(story, storyAfter)) {
        return null;
    }
    return storyAfter;
}
