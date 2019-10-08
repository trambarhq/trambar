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

            // purge pages that're dependent on the items to be purged as well
            dependentURLs = pullDependents(project, targetURLs);
            for (let entry of cacheEntries) {
                if (matchCriteria(entry, dependentURLs)) {
                    console.log('DEP: ', entry);
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
                return /\?lang=/.test(entry.url);
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

async function stat(project) {
    const entries = await loadCacheEntries();
    const matching = _.filter(entries, (entry) => {
        return matchProject(entry, project);
    });
    if (_.isEmpty(matching)) {
        return 'EMPTY';
    }
    const sorted = _.orderBy(matching, 'mtime', 'desc');
    const table = new AsciiTable;
    table.setHeading('URL', 'Date', 'Size');
    for (let { url, mtime, size } of sorted) {
        const date = Moment(mtime).format('LLL');
        const fileSize = _.fileSize(size);
        table.addRow(url, date, fileSize);
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
            const key = await loadCacheEntryKey(path);
            const slashIndex = _.indexOf(key, '/');
            const host = key.substr(0, slashIndex);
            const url = key.substr(slashIndex);
            entry = cacheEntryCache[md5] = { host, url, md5, mtime, size };
        }
        return entry;
    } catch (err) {
        delete cacheEntryCache[md5];
        return null;
    }
}

async function loadCacheEntryKey(path) {
    const buf = Buffer.alloc(1024);
    const fh = await FS.open(path, 'r');
    try {
        await fh.read(buf, 0, 1024, 0);
    } finally {
        await fh.close();
    }
    const si = buf.indexOf('KEY:');
    const ei = buf.indexOf('\n', si);
    if (si !== -1 && ei !== -1) {
        const s = buf.toString('utf-8', si + 4, ei).trim();;
        return s;
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
