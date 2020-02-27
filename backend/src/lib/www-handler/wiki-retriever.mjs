import _ from 'lodash';
import Database from '../database.mjs';
import * as TaskLog from '../task-log.mjs'
import HTTPError from '../common/errors/http-error.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as MediaImporter from '../media-server/media-importer.mjs';

import Repo from '../accessors/repo.mjs';
import Wiki from '../accessors/wiki.mjs';

async function discover(project, identifier, search) {
  const taskLog = TaskLog.start('wiki-discover', {
    project: project.name,
    identifier
  });
  try {
    const schema = project.name;
    const contents = [];
    const db = await Database.open();
    const criteria = await addRepoCheck(db, identifier, {
      public: true,
      deleted: false,
      hidden: false,
    });
    if (search) {
      criteria.search = search;
    } else {
      criteria.chosen = true;
    }
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
    throw err;
  }
}

async function retrieve(project, identifier, slug) {
  const taskLog = TaskLog.start('wiki-retrieve', {
    project: project.name,
    identifier,
    slug
  });
  try {
    const schema = project.name;
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

    const title = createTitle(wiki.details.title || '');
    const contents = {
      slug: wiki.slug,
      title: {
        json: [ title ],
      },
      content: {
        json: wiki.details.json || [],
        resources: wiki.details.resources,
      }
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

function createTitle(slug) {
  let title = slug.replace(/-/g, ' ');
  title = title.substr(0, 1).toUpperCase() + title.substr(1);
  return title;
}

export {
  discover,
  retrieve,
}
