import _ from 'lodash';
import CrossFetch from 'cross-fetch';
import Zlib from 'zlib';
import Tar from 'tar';
import ConcatStream from 'concat-stream';
import GeoIP2Node from '@maxmind/geoip2-node';
import Database from '../database.mjs';
import * as TaskLog from '../task-log.mjs';

import Story from '../accessors/story.mjs';

let traffic = {};

async function recordIP(schema, ip) {
    try {
        const country = await findCountry(ip);
        const count = _.get(traffic, [ schema, country ], 0);
        _.set(traffic, [ schema, country ], count + 1);
        return country;
    } catch (err) {
        return 'zz';
    }
}

function moveStatistics(schemaBefore, schemaAfter) {
    const stats = _.get(traffic, schemaBefore);
    _.unset(traffic, schemaBefore);
    if (stats) {
        _.set(traffic, schemaAfter, stats);
    }
}

async function saveStatistics() {
    const oldTraffic = traffic;
    traffic = {};

    const db = await Database.open();
    for (let [ schema, stats ] of _.entries(traffic)) {
    }
}

async function findCountry(ip) {
    const reader = await initializeReader();
    const response = await reader.country(ip);
    return _.toLower(response.country.isoCode);
}

let readerPromise, reader, lastModified;

async function initializeReader() {
    if (!readerPromise) {
        readerPromise = initializeReaderUncached();
    }
    return readerPromise;
}

async function initializeReaderUncached() {
    const buffer = await downloadGeoLite2();
    reader = GeoIP2Node.Reader.openBuffer(buffer);
    lastModified = buffer.mtime;
    return reader;
}

async function updateDatabase() {
    if (lastModified) {
        const buffer = await downloadGeoLite2(lastModified);
        if (buffer) {
            reader = GeoIP2Node.Reader.openBuffer(buffer);
            readerPromise = Promise.resolve(reader);
            lastModified = buffer.mtime;
        }
    }
}

const geoLite2URL = 'https://geolite.maxmind.com/download/geoip/database/GeoLite2-Country.tar.gz';

async function downloadGeoLite2(lastModified) {
    const taskLog = TaskLog.start('geoip-database-download');
    try {
        const options = {};
        if (lastModified) {
            options.headers = {
                'if-modified-since': lastModified
            }
        }
        const res = await CrossFetch(geoLite2URL, options);
        if (res.status >= 400) {
            throw new HTTPError(res.status);
        }
        let data = null;
        if (res.status === 200) {
            data = await new Promise(function (resolve, reject) {
                const tar = res.body.pipe(Zlib.createGunzip()).pipe(new Tar.Parse);
                let mmdb;
                tar.on('entry', (entry) => {
                    entry.pipe(ConcatStream((buf) => {
                        if (!mmdb && /\.mmdb$/.test(entry.path)) {
                            mmdb = buf;
                        }
                    }));
                });
                tar.on('end', () => {
                    resolve(mmdb);
                });
                tar.on('error', (err) => {
                    reject(err);
                });
            });
            data.mtime = res.headers.get('last-modified');
            taskLog.set('size', _.fileSize(data.length));
        }
        await taskLog.finish();
        return data;
    } catch (err) {
        await taskLog.abort(err);
    }
}

export {
    recordIP,
    findCountry,
    saveStatistics,
    moveStatistics,
    updateDatabase,
};
