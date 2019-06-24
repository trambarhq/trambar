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
import HTTPError from './lib/common/errors/http-error.mjs';
import * as ExternalDataUtils from './lib/common/objects/utils/external-data-utils.mjs';

import * as ExcelParser from './lib/www-handler/excel-parser.mjs';
import * as ExcelRetriever from './lib/www-handler/excel-retriever.mjs';

import Project from './lib/accessors/project.mjs';
import Repo from './lib/accessors/repo.mjs';
import Spreadsheet from './lib/accessors/spreadsheet.mjs';
import Wiki from './lib/accessors/wiki.mjs';

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
    const taskLog = TaskLog.start('wiki-request-handle', {
        project: schema,
    });
    try {
        const db = await Database.open();
        const criteria = { slug, public: true, deleted: false };
        if (repoName) {
            // check repo association when repo name is given
            const repo = await Repo.findOne(db, 'global', { name: repoName }, 'external');
            if (!repo) {
                throw new HTTPError(404);
            }
            const repoLink = ExternalDataUtils.findLinkByRelations(repo, 'repo');
            criteria.external_object = repoLink;
        }
        const wiki = await Wiki.findOne(db, schema, criteria, 'details');
        if (!wiki) {
            throw new HTTPError(404);
        }
        res.type('text').send(wiki.details.content);
        taskLog.set('slug', slug);
        if (repoName) {
            taskLog.set('repo', repoName);
        }
        controlCache(res);
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
        next(err);
    }
}

async function handleExcelRequest(req, res, next) {
    const { schema, name } = req.params;
    const taskLog = TaskLog.start('excel-request-handle', {
        project: schema,
    });
    try {
        const db = await Database.open();
        const criteria = { name, deleted: false };
        let spreadsheet = await Spreadsheet.findOne(db, schema, criteria, '*');
        if (!spreadsheet) {
            throw new HTTPError(404);
        }
        let changed = false;
        taskLog.describe(`retreiving ${spreadsheet.url}`);
        const buffer = await ExcelRetriever.fetch(spreadsheet);
        if (buffer) {
            taskLog.describe(`parsing Excel file`);
            const { etag, type } = buffer;
            const data = await ExcelParser.parse(buffer);
            const spreadsheetChanges = {
                id: spreadsheet.id,
                details: { type, data },
                etag,
            };
            spreadsheet = await Spreadsheet.updateOne(db, schema, spreadsheetChanges);
            changed = true;
        }
        controlCache(res, { 's-maxage': 5 }, spreadsheet.etag);
        res.json(spreadsheet.details.data);
        taskLog.set('name', name);
        taskLog.set('changed', changed);
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
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
    const taskLog = TaskLog.start('page-request-handle', {
        project: schema,
    });
    try {
        res.json({ schema, path });
        taskLog.set('path', path);
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
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
