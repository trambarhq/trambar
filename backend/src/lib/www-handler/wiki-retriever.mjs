import _ from 'lodash';
import Database from '../database.mjs';
import * as TaskLog from '../task-log.mjs'
import HTTPError from '../common/errors/http-error.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as MediaImporter from '../media-server/media-importer.mjs';

import Repo from '../accessors/repo.mjs';
import Wiki from '../accessors/wiki.mjs';

async function discover(schema, identifier) {
    const taskLog = TaskLog.start('wiki-discover', { project: schema, identifier });
    try {
        const contents = [];
        const db = await Database.open();
        const criteria = await addRepoCheck(db, identifier, {
            chosen: true,
            deleted: false
        });
        const wikis = await Wiki.find(db, schema, criteria, 'slug, external');
        for (let wiki of wikis) {
            if (identifier) {
                contents.push(wiki.slug);
            } else {
                // need to look up the repo
                const repoLink = ExternalDataUtils.findLinkByRelations(wiki, 'repo');
                const repoCriteria = {
                    external_object: repoLink,
                    deleted: false
                };
                const repo = await Repo.findOne(db, 'global', repoCriteria, 'name');
                if (repo) {
                    contents.push(`${repo.name}/${wiki.slug}`);
                }
            }
        }
        const cacheControl = {};

        await taskLog.finish('count', contents.length);
        return { contents, cacheControl };
    } catch (err) {
        await taskLog.abort(err);
    }
}

async function retrieve(schema, identifier, slug) {
    const taskLog = TaskLog.start('wiki-retrieve', { project: schema, identifier, slug });
    try {
        const db = await Database.open();
        const criteria = await addRepoCheck(db, identifier, {
            slug,
            public: true,
            deleted: false,
        });
        let wiki = await Wiki.findOne(db, schema, criteria, '*');
        if (!wiki) {
            throw new HTTPError(404);
        }

        let changed = false;
        if (!_.isEmpty(wiki.details.resources)) {
            const wikiChanges = _.cloneDeep(wiki);
            const resources = wikiChanges.details.resources;
            for (let res of resources) {
                // check external image references
                if (/^\w+:/.test(res.src)) {
                    try {
                        const info = await MediaImporter.importFile(res.src);
                        _.assign(res, info);
                    } catch (err) {
                    }
                }
            }
            if (!_.isEqual(wiki, wikiChanges)) {
                wiki = await Wiki.saveOne(db, schema, wikiChanges);
                changed = true;
            }
        }

        // trim resource URLs
        const mediaBaseURL = '/srv/media/';
        _.each(wiki.details.resources, (res) => {
            if (_.startsWith(res.url, mediaBaseURL)) {
                res.url = res.url.substr(mediaBaseURL.length);
            }
        });

        const contents = {
            identifier,
            slug: wiki.slug,
            title: wiki.details.title || '',
            markdown: wiki.details.content || '',
            resources: wiki.details.resources || [],
        };
        // expires frequently when wiki links to external images
        const hasExternal = _.some(contents.resources, (res) => {
            return /^\w+:/.test(res.src);
        });
        const maxAge = (hasExternal) ? 60 : undefined;
        const cacheControl = { 's-maxage': maxAge };

        taskLog.set('changed', changed);
        await taskLog.finish();
        return { contents, cacheControl };
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

async function addRepoCheck(db, repoName, criteria) {
    if (repoName !== undefined) {
        const repo = await Repo.findOne(db, 'global', { name: repoName }, 'external');
        if (!repo) {
            throw new HTTPError(404);
        }
        const repoLink = ExternalDataUtils.findLinkByRelations(repo, 'repo');
        criteria.external_object = repoLink;
    }
    return criteria;
}

export {
    discover,
    retrieve,
}
