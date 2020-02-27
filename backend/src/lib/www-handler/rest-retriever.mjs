import _ from 'lodash';
import CrossFetch from 'cross-fetch';
import { AsyncParser, JSONRenderer } from 'mark-gor/html.mjs';
import Database from '../database.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as TaskLog from '../task-log.mjs';

import * as ProjectSettings from './project-settings.mjs';
import Rest from '../accessors/rest.mjs';

async function discover(project, type) {
  const taskLog = TaskLog.start('rest-discover', {
    project: project.name,
    type
  });
  try {
    const schema = project.name;
    const contents = [];
    const db = await Database.open();
    const criteria = {
      deleted: false,
      disabled: false
    };
    if (type) {
      criteria.type = type;
    }
    const rests = await Rest.find(db, schema, criteria, 'name');
    for (let rest of rests) {
      contents.push(rest.name);
    }
    const cacheControl = {};

    taskLog.set('count', contents.length);
    await taskLog.finish();
    return { contents, cacheControl };
  } catch (err) {
    await taskLog.abort(err);
    throw err;
  }
}

async function retrieve(project, identifier, path, query) {
  const taskLog = TaskLog.start('rest-retrieve', {
    project: project.name,
    identifier,
    path
  });
  try {
    const schema = project.name;
    const db = await Database.open();
    const criteria = {
      name: identifier,
      deleted: false,
      disabled: false
    };
    let rest = await Rest.findOne(db, schema, criteria, '*');
    if (!rest) {
      throw new HTTPError(404);
    }
    const url = getExternalURL(path, query, rest);
    const unfiltered = await fetchJSON(url, rest);
    const contents = await transformData(unfiltered, url, rest);
    const maxAge = _.get(rest, 'settings.max_age', 30);
    const cacheControl = { 's-maxage': maxAge };

    taskLog.set('objects', _.size(contents));
    await taskLog.finish();
    return { contents, cacheControl };
  } catch (err) {
    await taskLog.abort(err);
    throw err;
  }
}

async function translatePurgeRequest(host, url, method) {
  const results = [];
  const db = await Database.open();
  const criteria = { deleted: false, disabled: false };
  const projects = ProjectSettings.all();
  for (let project of projects) {
    const schema = project.name;
    const rests = await Rest.find(db, schema, criteria, '*');
    for (let rest of rests) {
      try {
        const urlParts = new URL(rest.url);
        if (urlParts.hostname === host) {
          const identifier = rest.name;
          const untransformed = { project, identifier, url, method };
          const purge = transformPurge(untransformed, rest);
          if (purge instanceof Array) {
            for (let p of purge) {
              results.push(p)
            }
          } else {
            results.push(purge)
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
  return results;
}

async function fetchJSON(url, rest) {
  const res = await CrossFetch(url);
  if (res.status === 200) {
    let json = await res.json();
    if (json instanceof Array) {
      let total, pages;
      if (rest.type === 'wordpress') {
        total = parseInt(res.headers.get('x-wp-total'));
        pages = parseInt(res.headers.get('x-wp-totalpages'));
      }
      json.total = total;
      json.pages = pages;
    }
    return json;
  } else {
    const args = [ res.status ];
    try {
      const json = await res.json();
      args.push(json);
    } catch (err) {
      try {
        const message = await res.text();
        args.push(message);
      } catch (err) {
      }
    }
    throw new HTTPError(...args);
  }
}

function getExternalURL(path, query, rest) {
  const url = new URL(path || '', rest.url);
  for (let key in query) {
    url.searchParams.set(key, query[key]);
  }
  return url.href;
}

async function transformData(data, url, rest) {
  let filtered;
  if (rest.type === 'wordpress') {
    filtered = transformWPData(data, url);
  } else {
    return data;
  }
  if (filtered instanceof Array) {
    filtered.total = data.total;
    filtered.pages = data.pages;
  }
  return filtered;
}

const wpProps = {
  _links: { omit: true },
  authentication: { omit: true },
  date: { omit: true },
  description: { html: true },
  comment_status: { omit: true },
  guid: { omit: true },
  modified: { omit: true },
  name: { html: true },
  namespaces: { omit: true },
  routes: { omit: true },
  ping_status: { omit: true },
  template: { omit: true },
};

async function transformWPData(data, url) {
  if (data instanceof Array) {
    return _.map(data, 'id');
  } else {
    const res = {};
    for (let [ key, value ] of Object.entries(data)) {
      const prop = wpProps[key] || {};
      if (!prop.omit) {
        let html, additional;
        if (value instanceof Object) {
          const { rendered, ...others } = value;
          if (typeof(rendered) === 'string') {
            html = rendered;
            additional = others;
          }
        } else if (prop.html) {
          html = value;
          additional = {};
        }
        if (html !== undefined) {
          // parse the HTML
          const json = await parseHTML(html);
          const resources = await importImages(json);
          value = { json, resources, ...additional };
        }
        res[key] = value;
      }
    }
    return res;
  }
}

function transformPurge(purge, rest) {
  if (rest.type === 'wordpress') {
    return transformWPPurge(purge, rest);
  }
  return purge;
}

function transformWPPurge(purge, rest) {
  if (purge.method === 'regex') {
    return purge;
  } else if (purge.method === 'default') {
    const baseURLParts = new URL(_.trimEnd(rest.url, '/'));
    const { project, url, identifier } = purge;
    if (_.startsWith(url, baseURLParts.pathname + '/')) {
      const relativeURL = url.substr(baseURLParts.pathname.length);
      const m = /^(\/\w+\/\w+\/\w+)\/(\d+)\/$/.exec(relativeURL);
      if (m) {
        // purge both the file and all listings
        const folderPath = m[1];
        const purgeFolder = {
          project,
          identifier,
          url: `${folderPath}/\\??.*`,
          method: 'regex'
        };
        const purgeFile = {
          project,
          identifier,
          url: relativeURL,
          method: 'default'
        };
        return [ purgeFile, purgeFolder ];
      } else if (relativeURL === '/') {
        return {
          project,
          identifier,
          url: relativeURL,
          method: 'default'
        };
      }
    }
  }
  return [];
}

async function parseHTML(html) {
  const parser = new AsyncParser({ htmlOnly: true });
  const renderer = new JSONRenderer;
  const tokens = await parser.parse(html);
  const json = renderer.render(tokens);
  return json;
}

async function importImages(json) {
  const list = [];
  return (list.length > 0) ? list : undefined;
}

export {
  discover,
  retrieve,

  translatePurgeRequest,
};
