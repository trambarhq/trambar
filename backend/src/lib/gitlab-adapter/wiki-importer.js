import _ from 'lodash';
import Moment from 'moment';
import MarkGorParser from 'mark-gor/lib/parser';

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
            await Story.updateOne(db, schema, { id: recentStory.id, deleted: true });
        }
        return null;
    } else {
        const storyNew = copyEventProperties(null, system, server, repo, author, glHookEvent);
        const storySaved = await Story.saveOne(db, schema, storyNew);
        return storySaved;
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
    const defLangCode = Localization.getDefaultLanguageCode(system);

    const storyAfter = _.cloneDeep(story) || {};
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

/**
 * Import wikis from repo
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise<Array>}
 */
async function importWikis(db, system, server, repo, project) {
    const wikiList = [];
    const schema = project.name;
    const repoLink = ExternalDataUtils.findLink(repo, server);
    const wikis = await Wiki.find(db, schema, { deleted: false });
    const glWikis = await fetchWikis(server, repoLink.project.id);

    // delete ones that no longer exists
    for (let wiki of wikis) {
        const wikiLink = ExternalDataUtils.findLink(wiki, server);
        if (!_.some(glWikis, { id: wikiLink.wiki.id })) {
            await Wiki.updateOne(db, schema, { id: wiki.id, deleted: true });
        }
    }

    const wikiRefLists = [];
    for (let glWiki of glWikis) {
        const refs = findWikiReferences(glWiki.content, glWiki.format);
        wikiRefLists.push({ refs, glWikiReferrer: glWiki });
    }

    const findWiki = (glWiki) => {
        return _.find(wikis, (wiki) => {
            return !!ExternalDataUtils.findLink(wiki, server, {
                wiki: { id: glWiki.id }
            });
        });
    };
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
        const wiki = findWiki(glWiki);
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
        const wiki = findWiki(glWiki);
        const wikiAfter = copyWikiProperties(wiki, system, server, repo, glWiki, isPublic(glWiki));
        if (wikiAfter !== wiki) {
            const wikiSaved = await Story.updateOne(db, schema, wikiAfter);
            wikiList.push(wikiSaved);
        } else {
            wikiList.push(wiki);
        }
    }
    return wikiList;
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
 * @return {Story}
 */
function copyWikiProperties(wiki, system, server, repo, glWiki, isPublic) {
    const defLangCode = Localization.getDefaultLanguageCode(system);
    const wikiAfter = _.cloneDeep(wiki) || {};
    ExternalDataUtils.inheritLink(wikiAfter, server, repo, {
        wiki: { id: glWiki.id }
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'language_codes', {
        value: [ defLangCode ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(wikiAfter, server, 'slug', {
        value: glWiki.slug,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(wikiAfter, server, 'details.title', {
        value: glWiki.title,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(wikiAfter, server, 'details.content', {
        value: (isPublic) ? glWiki.content : undefined,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(wikiAfter, server, 'details.format', {
        value: glWiki.format,
        overwrite: 'always',
    });
    if (_.isEqual(wikiAfter, wiki)) {
        return wiki;
    }
    return wikiAfter;
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
        for (let inlineToken of blockToken.children) {
            if (inlineToken.type === 'link') {
                slugs.push(inlineToken.href);
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
    let url = `/projects/${glProjectId}/wikis/${slug}?with_content=1`;
    return Transport.fetch(server, url);
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
    let url = `/projects/${glProjectId}/wikis?with_content=1`;
    return Transport.fetchAll(server, url);
}

export {
    importHookEvent,
    importWikis,
};
