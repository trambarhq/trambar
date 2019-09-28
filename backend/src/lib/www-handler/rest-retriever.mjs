import _ from 'lodash';
import CrossFetch from 'cross-fetch';
import ExcelJS from 'exceljs';
import Database from '../database.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as TaskLog from '../task-log.mjs';

import Project from '../accessors/project.mjs';
import Rest from '../accessors/rest.mjs';

async function discover(schema, type) {
    const taskLog = TaskLog.start('rest-discover', { project: schema, type });
    try {
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

async function retrieve(schema, identifier, path, query) {
    const taskLog = TaskLog.start('rest-retrieve', { project: schema, identifier, path });
    try {
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
        const data = filterData(unfiltered, url, rest);
        const contents = (data instanceof Array) ? data : {
            identifier,
            rest: data,
        };
        const maxAge = _.get(rest, 'settings.max_age', 30);
        const cacheControl = { 's-maxage': maxAge };

        taskLog.set('objects', _.size(data));
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
    const projects = await Project.find(db, 'global', criteria, 'name');
    for (let project of projects) {
        const schema = project.name;
        const rests = await Rest.find(db, schema, criteria, '*');
        for (let rest of rests) {
            try {
                const urlParts = new URL(rest.url);
                if (urlParts.hostname === host) {
                    const identifier = rest.name;
                    const untransformed = { schema, identifier, url, method };
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

function filterData(data, url, rest) {
    let filtered;
    if (rest.type === 'wordpress') {
        filtered = filterWPData(data, url);
    } else {
        return data;
    }
    if (filtered instanceof Array) {
        filtered.total = data.total;
        filtered.pages = data.pages;
    }
    return filtered;
}

function filterWPData(data, url) {
    if (data instanceof Array) {
        return _.map(data, 'id');
    } else {
        const omissions = [
            '_links',
            'namespaces',
            'routes',
            'authentication',
            'guid',
            'date',
            'modified',
            'comment_status',
            'ping_status',
            'template',
        ];
        return _.omit(data, omissions);
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
        const { schema, url, identifier } = purge;
        if (_.startsWith(url, baseURLParts.pathname + '/')) {
            const relativeURL = url.substr(baseURLParts.pathname.length);
            const m = /^(\/\w+\/\w+\/\w+)\/(\d+)\/$/.exec(relativeURL);
            if (m) {
                // purge both the file and all listings
                const folderPath = m[1];
                const purgeFolder = {
                    schema,
                    identifier,
                    url: `${folderPath}/\\??.*`,
                    method: 'regex'
                };
                const purgeFile = {
                    schema,
                    identifier,
                    url: relativeURL,
                    method: 'default'
                };
                return [ purgeFile, purgeFolder ];
            } else if (relativeURL === '/') {
                return {
                    schema,
                    identifier,
                    url: relativeURL,
                    method: 'default'
                };
            }
        }
    }
    return [];
}

export {
    discover,
    retrieve,

    translatePurgeRequest,
};
