import _ from 'lodash';
import CrossFetch from 'cross-fetch';
import ExcelJS from 'exceljs';
import Database from '../database.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as TaskLog from '../task-log.mjs'

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
        const unfiltered = await fetchJSON(url);
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

async function fetchJSON(url) {
    const res = await CrossFetch(url);
    if (res.status === 200) {
        const json = await res.json();
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
    if (rest.type === 'wordpress') {
        return filterWordPressData(data, url);
    }
    return data;
}

function filterWordPressData(data, url) {
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

export {
    discover,
    retrieve,
};
