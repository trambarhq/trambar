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

async function purge(pattern) {
    const taskLog = TaskLog.start('nginx-cache-purge', {
        pattern: pattern.toString()
    });
    try {
        const purged = [];
        if (typeof(pattern) === 'string') {
            const url = pattern;
            const md5 = Crypto.createHash('md5').update(url).digest('hex');
            const success = await removeCacheEntry({ url, md5 });
            if (success) {
                purged.push(url);
            }
        } else if (pattern instanceof RegExp) {
            const cacheEntries = await loadCacheEntries();
            for (let cacheEntry of cacheEntries) {
                if (pattern.test(cacheEntry.url)) {
                    const success = await removeCacheEntry(cacheEntry);
                    if (success) {
                        purged.push(cacheEntry.url);
                    }
                }
            }
        }

        // purge files that're dependent on the purged items
        for (let [ url, sourceURLs ] of Object.entries(fileDependencies)) {
            const overlap = _.intersection(sourceURLs, purged);
            if (!_.isEmpty(overlap)) {
                const md5 = Crypto.createHash('md5').update(url).digest('hex');
                const success = await removeCacheEntry({ url, md5 });
                if (success) {
                    purged.push(url);
                }
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
    if (!cacheEntriesPromise) {
        cacheEntriesPromise = loadCacheEntriesUncached();
    }
    const entries = await cacheEntriesPromise;
    cacheEntriesPromise = null;
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

async function stat() {
    const entries = await loadCacheEntries();
    if (_.isEmpty(entries)) {
        return 'EMPTY';
    }
    const sorted = _.orderBy(entries, 'mtime', 'desc');
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
