import _ from 'lodash';
import Moment from 'moment';

import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

// accessors
import Story from '../accessors/story.mjs';
import User from '../accessors/user.mjs';

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
 * @return {Promise<Boolean>}
 */
async function processHookEvent(db, system, server, repo, project, author, glHookEvent) {
    const schema = project.name;
    // see if there's story about this page recently
    // one story a day about a page is enough
    const criteria = {
        newer_than: Moment().subtract(1, 'day').toISOString(),
        external_object: ExternalDataUtils.extendLink(server, repo, {
            wiki: { id: glHookEvent.object_attributes.slug }
        }),
    };
    const recentStory = await Story.findOne(db, schema, criteria, 'id');
    if (recentStory) {
        if (glHookEvent.object_attributes.action === 'delete') {
            // remove the story if the page is no longer there
            const storyAfter = await Story.updateOne(db, schema, { id: recentStory.id, deleted: true });
        }
    } else {
        const storyNew = copyEventProperties(null, system, server, repo, author, glHookEvent);
        const storyAfter = await Story.saveOne(db, schema, storyNew);
    }
    return true;
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
    const defLangCode = _.get(system, [ 'settings', 'input_languages', 0 ]);

    const storyChanges = _.cloneDeep(story) || {};
    ExternalDataUtils.inheritLink(storyChanges, server, repo, {
        wiki: { id: glHookEvent.object_attributes.slug }
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'type', {
        value: 'wiki',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'language_codes', {
        value: [ defLangCode ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'user_ids', {
        value: [ author.id ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'role_ids', {
        value: author.role_ids,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'details.url', {
        value: glHookEvent.object_attributes.url,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'details.title', {
        value: glHookEvent.object_attributes.title,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'details.action', {
        value: glHookEvent.object_attributes.action,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'details.slug', {
        value: glHookEvent.object_attributes.slug,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyChanges, server, 'ptime', {
        value: Moment().toISOString(),
        overwrite: 'always',
    });
    return storyChanges;
}

export {
    processHookEvent,
};
