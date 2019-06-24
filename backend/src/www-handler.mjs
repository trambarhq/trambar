import _ from 'lodash';
import Moment from 'moment';
import Path from 'path';
import URL from 'url';
import Express from 'express';
import CORS from 'cors';
import BodyParser from 'body-parser';
import Compression from 'compression';
import SpiderDetector from 'spider-detector';
import DNSCache from 'dnscache';
import Database from './lib/database.mjs';
import * as TaskLog from './lib/task-log.mjs'
import * as Shutdown from './lib/shutdown.mjs';

import * as ExcelRetriever from './lib/www-handler/excel-retriever.mjs';
import * as WikiRetriever from './lib/www-handler/wiki-retriever.mjs';

import Project from './lib/accessors/project.mjs';

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

const staticFileOptions = { maxAge: 3600000 };
const folder = Path.dirname(URL.fileURLToPath(import.meta.url));
const clientFolder = Path.resolve(`${folder}/../../client/www`);
const adminFolder = Path.resolve(`${folder}/../../admin/www`);

let server;
let database;

async function start() {
    // start up Express
    const app = Express();
    app.set('json spaces', 2);
    app.use(CORS());
    app.use(BodyParser.json());
    app.use(redirectToProject);
    app.use('/', Express.static(clientFolder, staticFileOptions));
    app.use('/admin', Express.static(adminFolder, staticFileOptions));
    app.get('/srv/www/:schema/wiki/:repoName/:slug', handleWikiRequest);
    app.get('/srv/www/:schema/wiki/:slug', handleWikiRequest);
    app.get('/srv/www/:schema/excel/:name', handleExcelRequest);
    app.get('/srv/www/:schema/:type(images|video|audio)/*', handleMediaRequest);
    app.get('/srv/www/:schema/*', handlePageRequest);
    app.use(handleError);

    await new Promise((resolve, reject) => {
        server = app.listen(80, () => {
            resolve();
            reject = null;
        });
        server.once('error', (evt) => {
            if (reject) {
                reject(new Error(evt.message));
            }
        })
    });

    // load project domain names
    const db = database = await Database.open(true);
    await db.need('global');
    await updateDomainNameTable(db);

    // listen for database change events
    const tables = [
        'project',
        'spreadsheet',
        'wiki',
    ];
    await db.listen(tables, 'change', handleDatabaseChanges, 500);
}

async function stop() {
    await Shutdown.close(server);

    if (database) {
        database.close();
        database = undefined;
    }
}

function handleError(err, req, res, next) {
    if (!res.headersSent) {
        const status = err.status || 400;
        res.type('text').status(status).send(err.message);
    }
}

async function handleWikiRequest(req, res, next) {
    const { schema, repoName, slug } = req.params;
    try {
        const wiki = await WikiRetriever.retrieve(schema, repoName, slug);
        controlCache(res);
        res.type('text').send(wiki.details.content);
    } catch (err) {
        next(err);
    }
}

async function handleExcelRequest(req, res, next) {
    const { schema, name } = req.params;
    const { redirected } = req;
    try {
        const spreadsheet = await ExcelRetriever.retrieve(schema, name, !!redirected);
        controlCache(res, { 's-maxage': 5 }, spreadsheet.etag);
        res.type('text').send(spreadsheet.details.data);
    } catch (err) {
        next(err);
    }
}

const defaultCacheControl = {
    'public': true,
    'max-age': 0,
    's-maxage': 60,
    'must-revalidate': true,
    'proxy-revalidate': true,
};

function controlCache(res, override, etag) {
    const params = { ...defaultCacheControl, ...override };
    const items = [];
    for (let [ name, value ] of _.entries(params)) {
        if (typeof(value) === 'number') {
            items.push(`${name}=${value}`);
        } else if (value === true) {
            items.push(name);
        }
    }
    res.set({ 'Cache-Control': items.join() });
    if (etag) {
        res.set({ 'ETag': etag });
    }
}

async function handlePageRequest(req, res, next) {
    const { schema } = req.params;
    const path = req.url;
    try {
        res.json({ schema, path });
    } catch (err) {
        next(err);
    }
}

async function handleMediaRequest(req, res, next) {
    const path = req.params[0];
    const type = req.params.type;
    try {
        const uri = `/srv/media/${type}/${path}`;
        res.set('X-Accel-Redirect', uri).end();
    } catch (err) {
        next(err);
    }
}

let projectDomainMap = {};

async function updateDomainNameTable(db) {
    const taskLog = TaskLog.start('project-domain-update');
    try {
        const projects = await Project.find(db, 'global', { deleted: false }, 'name, details');
        const newMap = {};
        for (let project of projects) {
            const domains = _.get(project, 'details.domains', []);
            for (let domain of domains) {
                newMap[domain] = project.name;
            }
        }
        taskLog.merge(newMap);
        projectDomainMap = newMap;
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
    }
}

function redirectToProject(req, res, next) {
    const host = req.headers.host;
    const schema = projectDomainMap[host];
    if (schema) {
        req.url = `/srv/www/${schema}${req.url}`;
        req.redirected = true;
    }
    next();
}

/**
 * Called when changes occurs in the database
 *
 * @param  {Array<Object>} events
 */
function handleDatabaseChanges(events) {
    const db = this;
    for (let event of events) {
        if (event.op === 'DELETE') {
            continue;
        }
        switch (event.table) {
            case 'project':
                updateDomainNameTable(db);
                break;
            case 'spreadsheet':
                // TODO: invalidate Nginx cache
                break;
            case 'wiki':
                // TODO: invalidate Nginx cache
                break;
        }
    }
}

if ('file://' + process.argv[1] === import.meta.url) {
    start();
    Shutdown.addListener(stop);
}

export {
    start,
    stop,
};
