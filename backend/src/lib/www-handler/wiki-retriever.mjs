import Database from '../database.mjs';
import * as TaskLog from '../task-log.mjs'
import HTTPError from '../common/errors/http-error.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import Repo from '../accessors/repo.mjs';
import Wiki from '../accessors/wiki.mjs';

async function retrieve(schema, repoName, slug) {
    const taskLog = TaskLog.start('wiki-retrieve', {
        project: schema,
    });
    try {
        const db = await Database.open();
        const criteria = { slug, public: true, deleted: false };
        if (repoName) {
            // check repo association when repo name is given
            const repo = await Repo.findOne(db, 'global', { name: repoName }, 'external');
            if (!repo) {
                throw new HTTPError(404);
            }
            const repoLink = ExternalDataUtils.findLinkByRelations(repo, 'repo');
            criteria.external_object = repoLink;
        }
        const wiki = await Wiki.findOne(db, schema, criteria, 'details');
        if (!wiki) {
            throw new HTTPError(404);
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

export {
    retrieve,
}
