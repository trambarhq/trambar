import _ from 'lodash';
import CrossFetch from 'cross-fetch';
import ExcelJS from 'exceljs';
import Database from '../database.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as TaskLog from '../task-log.mjs'

import Rest from '../accessors/rest.mjs';

async function discover(schema, prefix) {
    const taskLog = TaskLog.start('rest-discover', { project: schema, prefix });
    try {
        const db = await Database.open();
        const entries = [];
        const criteria = { deleted: false, disabled: false };
        const rests = await Rest.find(db, schema, criteria, 'name');
        for (let rest of rests) {
            const { name } = rest;
            if (!prefix || _.startsWith(name, prefix)) {
                entries.push({ name });
                taskLog.append('name', name);
            }
        }
        await taskLog.finish();
        return entries;
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

async function retrieve(schema, name, path, query) {
    const taskLog = TaskLog.start('rest-retrieve', { name, path });
    try {
        const db = await Database.open();
        const criteria = { name, deleted: false, disabled: false };
        let rest = await Rest.findOne(db, schema, criteria, '*');
        if (!rest) {
            throw new HTTPError(404);
        }
        const url = getExternalURL(path, query, rest);
        const unfiltered = await fetchJSON(url);
        const data = filterData(unfiltered, url, rest);
        const count = (data instanceof Array) ? data.length : 1;
        taskLog.set('objects', count);
        await taskLog.finish();
        return data;
    } catch (err) {
        await taskLog.abort(err);
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
    const url = new URL(path, rest.url);
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
