import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

// accessors
import Story from 'accessors/story';
import User from 'accessors/user';

/**
 * Import a wiki related event
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glHookEvent
 *
 * @return {Promise<Story|null>}
 */
async function importHookEvent(db, system, server, repo, project, author, glHookEvent) {
    let schema = project.name;
    // see if there's story about this page recently
    // one story a day about a page is enough
    let criteria = {
        newer_than: Moment().subtract(1, 'day').toISOString(),
        external_object: ExternalDataUtils.extendLink(server, repo, {
            wiki: { id: glHookEvent.object_attributes.slug }
        }),
    };
    let recentStory = await Story.findOne(db, schema, criteria, 'id');
    if (recentStory) {
        if (glHookEvent.object_attributes.action === 'delete') {
            // remove the story if the page is no longer there
            let columns = {
                id: recentStory.id,
                deleted: true,
            };
            await Story.updateOne(db, schema, columns);
        }
        return null;
    } else {
        let storyNew = copyEventProperties(null, system, server, repo, author, glHookEvent);
        return Story.saveOne(db, schema, storyNew);
    }
}

/**
 * Copy properties of event into story
 *
 * @param  {Story|null} story
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} glHookEvent
 *
 * @return {Object|null}
*/
function copyEventProperties(story, system, server, repo, author, glHookEvent) {
    let defLangCode = _.get(system, [ 'settings', 'input_languages', 0 ]);

    let storyAfter = _.cloneDeep(story) || {};
    ExternalDataUtils.inheritLink(storyAfter, server, repo, {
        wiki: { id: glHookEvent.object_attributes.slug }
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: 'wiki',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'language_codes', {
        value: [ defLangCode ],
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

export {
    importHookEvent,
};
