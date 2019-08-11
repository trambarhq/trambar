import _ from 'lodash';
import Database from '../database.mjs';
import * as TaskLog from '../task-log.mjs'
import HTTPError from '../common/errors/http-error.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as MediaImporter from '../media-server/media-importer.mjs';

import Repo from '../accessors/repo.mjs';
import Wiki from '../accessors/wiki.mjs';

async function discover(schema, repoName, prefix) {
    const db = await Database.open();
    const criteria = await addRepoCheck(db, repoName, {
        chosen: true,
        deleted: false
    });
    const wikis = await Wiki.find(db, schema, criteria, 'slug, external');
    const repos = {};
    const entries = [];
    for (let wiki of wikis) {
        const repoLink = ExternalDataUtils.findLinkByRelations(wiki, 'repo');
        const repoLinkJSON = JSON.stringify(repoLink);
        let repo = repos[repoLinkJSON];
        if (repo === undefined) {
            const repoCriteria = {
                external_object: repoLink,
                deleted: false
            };
            repo = await Repo.findOne(db, 'global', repoCriteria, 'name');
            repos[repoLinkJSON] = repo || null;
        }
        if (repo) {
            if (!prefix || _.startsWith(wiki.slug, prefix)) {
                entries.push({
                    slug: wiki.slug,
                    repo: repo.name
                });
            }
        }
    }
    return entries;
}

async function retrieve(schema, repoName, slug) {
    const taskLog = TaskLog.start('wiki-retrieve', {
        project: schema,
    });
    try {
        const db = await Database.open();
        const criteria = await addRepoCheck(db, repoName, {
            slug,
            public: true,
            deleted: false,
        });
        let wiki = await Wiki.findOne(db, schema, criteria, '*');
        if (!wiki) {
            throw new HTTPError(404);
        }

        if (!_.isEmpty(wiki.details.resources)) {
            const wikiChanges = _.clone(wiki);
            const resources = wikiChanges.details.resources;
            for (let resource of resources) {
                // check external image references
                const { src } = resource;
                if (/^\w+:/.test(src)) {
                    try {
                        const info = await MediaImporter.importFile(src);
                        _.assign(resource, info);
                    } catch (err) {
                    }
                }
            }
            if (!_.isEqual(wiki, wikiChanges)) {
                wiki = await Wiki.saveOne(db, schema, wikiChanges);
            }
        }

        taskLog.set('slug', slug);
        if (repoName) {
            taskLog.set('repo', repoName);
        }
        await taskLog.finish();
        return wiki;
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
