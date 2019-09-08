import _ from 'lodash';
import Moment from 'moment';
import { promises as FS } from 'fs';
import AsciiTable from 'ascii-table';
import Crypto from 'crypto';
import * as TaskLog from '../task-log.mjs'

const CACHE_PATH = '/var/cache/nginx/data';

const fileDependencies = {};

function link(url, sourceURLs) {
    fileDependencies[url] = sourceURLs;
}

async function purge(criteria) {
    let params, url, pattern, callback;
    if (typeof(criteria) === 'string') {
        url = criteria;
        params = { url };
    } else if (criteria instanceof RegExp) {
        pattern = criteria;
        params = { pattern };
    } else if (criteria instanceof Function) {
        callback = criteria;
        params = { callback: callback.name };
    } else {
        return;
    }
    const taskLog = TaskLog.start('nginx-cache-purge', params);
    try {
        const targets = [];
        if (url) {
            targets.push(createCacheEntry(url));
        } else {
            const cacheEntries = await loadCacheEntries();
            if (pattern) {
                for (let cacheEntry of cacheEntries) {
                    if (pattern.test(cacheEntry.url)) {
                        targets.push(cacheEntry);
                    }
                }
            } else if (callback) {
                for (let cacheEntry of cacheEntries) {
                    if (callback(cacheEntry.url)) {
                        targets.push(cacheEntry);
                    }
                }
            }
        }

        // purge pages that're dependent on the items to be purged as well
        for (let [ pageURL, sourceURLs ] of Object.entries(fileDependencies)) {
            const hasStaleDependencies = _.some(sourceURLs, (url) => {
                return _.some(targets, { url });
            });
            if (hasStaleDependencies) {
                if (!_.some(targets, { url: pageURL })) {
                    targets.push(createCacheEntry(pageURL));
                }
            }
        }

        const purged = [];
        for (let target of targets) {
            const success = await removeCacheEntry(target);
            if (success) {
                purged.push(target.url);
            }
        }
        if (purged.length > 0) {
            taskLog.set('count', purged.length);
            if (process.env.NODE_ENV !== 'production') {
                taskLog.set('purged', purged);
            }
        }
        await taskLog.finish();
        return purged;
    } catch (err) {
        await taskLog.abort(err);
    }
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

function createCacheEntry(url) {
    const md5 = Crypto.createHash('md5').update(url).digest('hex');
    return { url, md5 };
}

async function loadCacheEntry(md5) {
    try {
        const path = `${CACHE_PATH}/${md5}`;
        const { mtime, size } = await FS.stat(path);
        let entry = cacheEntryCache[md5];
        if (!entry || entry.mtime !== mtime) {
            const url = await loadCacheEntryKey(path);
            entry = cacheEntryCache[md5] = { url, md5, mtime, size };
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
    try {
        delete cacheEntryCache[entry.md5];
        delete fileDependencies[entry.url];
        await FS.unlink(`${CACHE_PATH}/${entry.md5}`);
        return true;
    } catch (err){
        return false;
    }
}

async function stat(pattern) {
    const entries = await loadCacheEntries();
    const matching = _.filter(entries, (entry) => {
        return pattern.test(entry.url);
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

export {
    link,
    purge,
    stat,
};
