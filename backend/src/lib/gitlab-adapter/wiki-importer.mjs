import _ from 'lodash';
import Moment from 'moment';
import MarkGorParser from 'mark-gor/lib/parser.js';
import * as TaskLog from '../task-log.mjs';
import * as Localization from '../localization.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as Transport from './transport.mjs';

// accessors
import Story from '../accessors/story.mjs';
import User from '../accessors/user.mjs';
import Wiki from '../accessors/wiki.mjs';

/**
 * Import wikis from repo
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise<Array<Wiki>>}
 */
async function importWikis(db, system, server, repo, project) {
    const taskLog = TaskLog.start('gitlab-wiki-import', {
        saving: true,
        server_id: server.id,
        server: server.name,
        repo_id: repo.id,
        repo: repo.name,
        project_id: project.id,
        project: project.name,
    });
    const wikisAfter = [];
    try {
        const schema = project.name;
        const repoLink = ExternalDataUtils.findLink(repo, server);
        const criteria = {
            external_object: repoLink,
            deleted: false,
        };
        const wikis = await Wiki.find(db, schema, criteria, '*');

        taskLog.describe('fetching wikis from GitLab server');
        const glWikis = await fetchWikis(server, repoLink.project.id);

        // delete ones that no longer exists
        for (let wiki of wikis) {
            if (!_.some(glWikis, { slug: wiki.slug })) {
                await Wiki.updateOne(db, schema, { id: wiki.id, deleted: true });
                taskLog.append('deleted', wiki.slug);
            }
        }

        const wikiRefLists = [];
        for (let glWiki of glWikis) {
            const refs = findWikiReferences(glWiki.content, glWiki.format);
            wikiRefLists.push({ refs, glWikiReferrer: glWiki });
        }

        const isPublic = (glWiki, checked) => {
            if (!checked) {
                checked = {};
            }
            if (checked[glWiki.slug]) {
                return false;
            } else {
                checked[glWiki.slug] = true;
            }

            // see if the wiki has been chosen
            const wiki = _.find(wikis, { slug: glWiki.slug });
            if (wiki && wiki.chosen) {
                return true;
            }

            // see if another wiki that references this one is public
            for (let { refs, glWikiReferrer } of wikiRefLists) {
                if (_.includes(refs, glWiki.slug)) {
                    return isPublic(glWikiReferrer, checked);
                }
            }
            return false;
        };
        for (let glWiki of glWikis) {
            const wiki = _.find(wikis, { slug: glWiki.slug });
            const wikiChanges = copyWikiProperties(wiki, system, server, repo, glWiki, isPublic(glWiki));
            const wikiAfter = (wikiChanges) ? await Wiki.saveOne(db, schema, wikiChanges) : wiki;
            wikisAfter.push(wikiAfter);
            if (wikiChanges) {
                taskLog.append((wiki) ? 'modified' : 'added', wikiAfter.slug);
            }
        }
        await taskLog.finish();
        return wikisAfter;
    } catch (err) {
        await taskLog.abort(err);
    }
    return wikisAfter;
}

/**
 * Import wikis from repo
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise<Array<Wiki>>}
 */
async function removeWikis(db, system, server, repo, project) {
    const taskLog = TaskLog.start('gitlab-wiki-remove', {
        server_id: server.id,
        server: server.name,
        repo_id: repo.id,
        repo: repo.name,
        project_id: project.id,
        project: project.name,
    });
    try {
        const schema = project.name;
        const repoLink = ExternalDataUtils.findLink(repo, server);
        const criteria = {
            external_object: repoLink,
            deleted: false,
        };
        const wikisAfter = await Wiki.updateMatching(db, schema, criteria, { deleted: true });
        if (!_.isEmpty(wikisAfter)) {
            taskLog.set('removed', _.size(wikisAfter));
        }
        await taskLog.finish();
        return wikisAfter;
    } catch (err) {
        await taskLog.abort(err);
        return [];
    }
}

/**
 * Copy properties of milestone
 *
 * @param  {Wiki|null} wiki
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} glWiki
 *
 * @return {Story|null}
 */
function copyWikiProperties(wiki, system, server, repo, glWiki, isPublic) {
    const defLangCode = Localization.getDefaultLanguageCode(system);
    const wikiChanges = _.cloneDeep(wiki) || {};
    ExternalDataUtils.inheritLink(wikiChanges, server, repo);
    ExternalDataUtils.importProperty(wikiChanges, server, 'language_codes', {
        value: [ defLangCode ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(wikiChanges, server, 'public', {
        value: isPublic,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(wikiChanges, server, 'slug', {
        value: glWiki.slug,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(wikiChanges, server, 'details.title', {
        value: glWiki.title,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(wikiChanges, server, 'details.content', {
        value: (isPublic) ? glWiki.content : undefined,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(wikiChanges, server, 'details.format', {
        value: glWiki.format,
        overwrite: 'always',
    });
    if (_.isEqual(wikiChanges, wiki)) {
        return null;
    }
    return wikiChanges;
}

function findWikiReferences(text, format) {
    if (format === 'markdown') {
        return findMarkdownReferences(text);
    } else {
        return [];
    }
}

function findMarkdownReferences(text) {
    const parser = new MarkGorParser;
    const blockTokens = parser.parse(text);
    const slugs = [];
    for (let blockToken of blockTokens) {
        if (blockToken.children instanceof Array) {
            for (let inlineToken of blockToken.children) {
                if (inlineToken.type === 'link') {
                    slugs.push(inlineToken.href);
                }
            }
        }
    }
    return slugs;
}

/**
 * Retrieve milestone from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {String} slug
 *
 * @return {Promise<Object>}
 */
async function fetchWiki(server, glProjectId, slug) {
    const url = `/projects/${glProjectId}/wikis/${slug}`;
    return Transport.fetch(server, url, { with_content: 1 });
}

/**
 * Retrieve milestone from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 *
 * @return {Promise<Array<Object>>}
 */
async function fetchWikis(server, glProjectId) {
    const url = `/projects/${glProjectId}/wikis/`;
    return Transport.fetchAll(server, url, { with_content: 1 });
}

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
 * @return {Promise}
 */
async function processHookEvent(db, system, server, repo, project, author, glHookEvent) {
    await importWikis(db, system, server, repo, project);

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
    importWikis,
    removeWikis,
    processHookEvent,
};
