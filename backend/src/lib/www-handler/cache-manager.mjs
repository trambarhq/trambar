import _ from 'lodash';
import Moment from 'moment';
import { promises as FS } from 'fs';
import Bluebird from 'bluebird';
import CrossFetch from 'cross-fetch';
import AsciiTable from 'ascii-table';
import * as TaskLog from '../task-log.mjs'

const CACHE_PATH = '/var/cache/nginx/data';

async function purge(project, criteria) {
  const taskLog = TaskLog.start('nginx-cache-purge', {
    project: (project) ? project.name : undefined,
    criteria: criteria,
  });
  try {
    const cacheEntries = await loadCacheEntries();
    const targetEntries = [];
    let dependentURLs;

    if (project) {
      const targetURLs = [];
      for (let entry of cacheEntries) {
        if (matchProject(entry, project)) {
          if (matchCriteria(entry, criteria)) {
            targetEntries.push(entry);
            targetURLs.push(entry.url);
          }
        }
      }

      // purge pages that're dependent on items to be purged as well
      dependentURLs = pullDependents(project, targetURLs);
      for (let entry of cacheEntries) {
        if (matchCriteria(entry, dependentURLs)) {
          if (!_.includes(targetEntries, entry)) {
            targetEntries.push(entry);
          }
        }
      }
    } else {
      for (let entry of cacheEntries) {
        targetEntries.push(entry);
      }
      clearDependents();
    }

    const purged = [];
    for (let entry of targetEntries) {
      try {
        await removeCacheEntry(entry);
        purged.push(entry.url);
      } catch (err) {
      }
    }
    if (purged.length > 0) {
      taskLog.set('count', purged.length);
      if (dependentURLs) {
        taskLog.set('dependents', dependentURLs.length);
      }
      if (process.env.NODE_ENV !== 'production') {
        taskLog.set('purged', purged);
      }

      // reload HTML pages--which always has a language code attached
      // due to the way we cache language-specific pages
      const htmlEntries = _.filter(targetEntries, (entry) => {
        if (entry.status === 200) {
          return /\?lang=/.test(entry.url);
        }
      });
      reloadCacheEntries(htmlEntries, 10, 250);
    }
    await taskLog.finish();
    return purged;
  } catch (err) {
    await taskLog.abort(err);
  }
}

function link(project, url, sourceURLs) {
  addDependent(project, url, sourceURLs);
}

async function stat(project, options) {
  const entries = await loadCacheEntries();
  const matching = _.filter(entries, (entry) => {
    return matchProject(entry, project);
  });
  if (_.isEmpty(matching)) {
    return 'EMPTY';
  }
  const showHash = (options) ? options.md5 : false;
  const sorted = _.orderBy(matching, 'mtime', 'desc');
  const table = new AsciiTable;
  const heading = [ 'URL', 'Date', 'Size' ];
  if (showHash) {
    heading.push('MD5')
  }
  table.setHeading(heading);
  for (let { url, mtime, size, md5, status } of sorted) {
    const date = Moment(mtime).format('LLL');
    const fileSize = (status === 200) ? _.fileSize(size) : '-';
    const title = (status === 200) ? url : `${url} [${status}]`;
    const row = [ title, date, fileSize ];
    if (showHash) {
      row.push(md5)
    }
    table.addRow(row);
  }
  return table.toString();
}

let cacheEntriesPromise = null;

async function loadCacheEntries() {
  const cached = !!cacheEntriesPromise;
  if (!cached) {
    cacheEntriesPromise = loadCacheEntriesUncached();
  }
  const entries = await cacheEntriesPromise;
  if (!cached) {
    setTimeout(() => {
      cacheEntriesPromise = null;
    }, 1000);
  }
  return entries;
}

async function loadCacheEntriesUncached() {
  const files = await FS.readdir(CACHE_PATH);
  const entries = [];
  for (let file of files) {
    if (/^[0-9a-f]{32}$/.test(file)) {
      const entry = await loadCacheEntry(file);
      if (entry) {
        entries.push(entry);
      }
    }
  }
  return entries;
}

const cacheEntryCache = {};

async function loadCacheEntry(md5) {
  try {
    const path = `${CACHE_PATH}/${md5}`;
    const { mtime, size } = await FS.stat(path);
    let entry = cacheEntryCache[md5];
    if (!entry || entry.mtime !== mtime) {
      const { key, status } = await loadCacheEntryProps(path);
      const slashIndex = _.indexOf(key, '/');
      const host = key.substr(0, slashIndex);
      const url = key.substr(slashIndex);
      entry = cacheEntryCache[md5] = { host, url, md5, mtime, size, status };
    }
    return entry;
  } catch (err) {
    delete cacheEntryCache[md5];
    return null;
  }
}

async function loadCacheEntryProps(path) {
  const buf = Buffer.alloc(1024);
  const fh = await FS.open(path, 'r');
  try {
    await fh.read(buf, 0, 1024, 0);
  } finally {
    await fh.close();
  }
  const keySI = buf.indexOf('KEY:');
  const keyEI = buf.indexOf('\n', keySI);
  const statusSI = buf.indexOf(' ', keyEI + 1);
  const statusEI = buf.indexOf(' ', statusSI + 1);
  if (keySI !== -1 && keyEI !== -1) {
    const key = buf.toString('utf-8', keySI + 4, keyEI).trim();
    const status = parseInt(buf.toString('utf-8', statusSI + 1, statusEI));
    return { key, status };
  } else {
    throw new Error('Unable to find key');
  }
}

async function removeCacheEntry(entry) {
  delete cacheEntryCache[entry.md5];
  await FS.unlink(`${CACHE_PATH}/${entry.md5}`);
  return true;
}

async function reloadCacheEntries(entries, limit, delay) {
  // favor pages with shorter URLs
  entries = _.sortBy(entries, 'url.length');
  if (limit) {
    entries = _.slice(entries, 0, limit)
  }
  for (let entry of entries) {
    if (delay) {
      await Bluebird.delay(delay);
    }
    await reloadCacheEntry(entry);
  }
}

async function reloadCacheEntry(entry) {
  try {
    const options = {
      method: 'head',
      headers: {
        'Host': entry.host
      }
    };
    const internalURL = 'http://nginx' + entry.url;
    await CrossFetch(internalURL, options);
  } catch (err) {
    console.error(err);
  }
}

function matchProject(entry, project) {
  const domainNames = _.get(project, 'settings.domains', []);
  if (_.includes(domainNames, entry.host)) {
    return true;
  } else if (_.isEmpty(domainNames)) {
    if (_.startsWith(entry.url, `/srv/www/${project.name}/`)) {
      return true;
    }
  }
  return false;
}

function matchCriteria(entry, criteria) {
  if (criteria === undefined) {
    return true;
  } else if (typeof(criteria) === 'string') {
    return (criteria === entry.url);
  } else if (criteria instanceof RegExp) {
    return criteria.test(entry.url);
  } else if (criteria instanceof Function) {
    return criteria(entry.url);
  } else if (criteria instanceof Array) {
    return _.includes(criteria, entry.url);
  }
  return false;
}

const fileDependencies = [];

function addDependent(project, url, sourceURLs) {
  _.remove(fileDependencies, (dependency) => {
    if (dependency.schema === project.name) {
      return (dependency.url === url);
    }
  });

  const schema = project.name;
  fileDependencies.push({ schema, url, sourceURLs });
}

function pullDependents(project, targetURLs) {
  const dependencies = _.remove(fileDependencies, (dependency) => {
    if (dependency.schema === project.name) {
      for (let targetURL of targetURLs) {
        if (_.includes(dependency.sourceURLs, targetURL)) {
          return true;
        }
      }
    }
  });
  return _.map(dependencies, 'url');
}

function clearDependents() {
  _.remove(fileDependencies);
}

export {
  purge,
  link,
  stat,
};
