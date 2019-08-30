import _ from 'lodash';
import './lib/common/utils/lodash-extra.mjs';
import Moment from 'moment';
import { promises as FS } from 'fs';
import Path from 'path';
import URL from 'url';
import Express from 'express';
import CORS from 'cors';
import Compression from 'compression';
import SpiderDetector from 'spider-detector';
import DNSCache from 'dnscache';
import Database from './lib/database.mjs';
import * as TaskLog from './lib/task-log.mjs'
import * as Shutdown from './lib/shutdown.mjs';
import * as Localization from './lib/localization.mjs';
import HTTPError from './lib/common/errors/http-error.mjs';

import * as CacheManager from './lib/www-handler/cache-manager.mjs';
import * as ExcelRetriever from './lib/www-handler/excel-retriever.mjs';
import * as PageGenerator from './lib/www-handler/page-generator.mjs';
import * as ProjectSettings from './lib/www-handler/project-settings.mjs';
import * as RestRetriever from './lib/www-handler/rest-retriever.mjs';
import * as SnapshotRetriever from './lib/www-handler/snapshot-retriever.mjs';
import * as TrafficMonitor from './lib/www-handler/traffic-monitor.mjs';
import * as WikiRetriever from './lib/www-handler/wiki-retriever.mjs';

import System from './lib/accessors/system.mjs';

import TaskQueue from './lib/task-queue.mjs';
import {
    TaskImportSpreadsheet,
    TaskPurgeSnapshotHead,
    TaskPurgeProject,
    TaskPurgeSpreadsheet,
    TaskPurgeWiki,
    TaskPurgeAll,

    PeriodicTaskSaveWebsiteTraffic,
    PeriodicTaskPublishWebsiteTraffic,
    PeriodicTaskUpdateGeoIPDatabase,
} from './lib/www-handler/tasks.mjs';

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

let server;
let database;
let taskQueue;

async function start() {
    // start up Express
    const app = Express();
    const corsOptions = {
        exposedHeaders: [ 'etag' ],
    };
    app.use(CORS(corsOptions));
    app.use(redirectToProject);
    app.set('json spaces', 2);
    app.get('/srv/www/.cache', handleCacheStatusRequest);
    app.get('/srv/www/:schema/data/geoip', handleGeoIPRequest);
    app.get('/srv/www/:schema/data/wiki/:identifier/:slug', handleWikiRequest);
    app.get('/srv/www/:schema/data/wiki/:identifier', handleWikiListRequest);
    app.get('/srv/www/:schema/data/wiki', handleWikiListRequest);
    app.get('/srv/www/:schema/data/excel/:identifier', handleExcelRequest);
    app.get('/srv/www/:schema/data/excel', handleExcelListRequest);
    app.get('/srv/www/:schema/data/rest/:identifier/*', handleRestRequest);
    app.get('/srv/www/:schema/data/rest/:identifier', handleRestRequest);
    app.get('/srv/www/:schema/data/rest', handleRestListRequest);
    app.get('/srv/www/:schema/data/meta', handleMetadataRequest);
    app.get('/srv/www/:schema/:type(images|video|audio)/*', handleMediaRequest);
    app.get('/srv/www/:schema/\\(:tag\\)/*', handleSnapshotFileRequest);
    app.get('/srv/www/:schema/*', handleSnapshotFileRequest);
    app.get('/srv/www/:schema/\\(:tag\\)/*', handleSnapshotPageRequest);
    app.get('/srv/www/:schema/*', handleSnapshotPageRequest);
    app.get('/admin/*', handleStaticFileRequest);
    app.get('/*', handleStaticFileRequest);

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
    await ProjectSettings.load(db);

    // listen for database change events
    const tables = [
        'project',
        'snapshot',
        'spreadsheet',
        'wiki',
    ];
    await db.listen(tables, 'change', handleDatabaseChanges, 500);

    taskQueue = new TaskQueue;
    taskQueue.schedule(new PeriodicTaskSaveWebsiteTraffic);
    taskQueue.schedule(new PeriodicTaskPublishWebsiteTraffic);
    taskQueue.schedule(new PeriodicTaskUpdateGeoIPDatabase);
    taskQueue.add(new TaskPurgeAll);
    await taskQueue.start();
}

async function stop() {
    await Shutdown.close(server);

    if (taskQueue) {
        await taskQueue.stop();
        taskQueue = undefined;
    }

    if (database) {
        database.close();
        database = undefined;
    }
}

async function handleCacheStatusRequest(req, res, next) {
    try {
        const text = await CacheManager.stat();
        res.set({ 'X-Accel-Expires': 0 });
        res.type('text').send(text);
    } catch (err) {
        next(err);
    }
}

async function handleGeoIPRequest(req, res, next) {
    try {
        const { schema } = req.params;
        //const ip = req.headers['x-forwarded-for'];
        const ip = '213.171.195.48';
        if (!ip) {
            throw new Error('Nginx did not send X-Forwarded-For header');
        }
        const country = await TrafficMonitor.recordIP(schema, ip);
        res.set({ 'X-Accel-Expires': 0 });
        res.type('text').send(country);
    } catch (err) {
        next(err);
    }
}

async function handleWikiRequest(req, res, next) {
    try {
        const { schema, identifier, slug } = req.params;
        const result = await WikiRetriever.retrieve(schema, identifier, slug);
        sendDataQueryResult(res, result);
    } catch (err) {
        next(err);
    }
}

async function handleWikiListRequest(req, res, next) {
    try {
        const { schema, identifier } = req.params;
        const search = await getSearchParameters(req);
        const result = await WikiRetriever.discover(schema, identifier, search);
        sendDataQueryResult(res, result);
    } catch (err) {
        next(err);
    }
}

async function handleExcelRequest(req, res, next) {
    try {
        const { schema, identifier } = req.params;
        const result = await ExcelRetriever.retrieve(schema, identifier);
        sendDataQueryResult(res, result);
    } catch (err) {
        next(err);
    }
}

async function handleExcelListRequest(req, res, next) {
    try {
        const { schema } = req.params;
        const search = await getSearchParameters(req);
        const result = await ExcelRetriever.discover(schema, search);
        sendDataQueryResult(res, result);
    } catch (err) {
        next(err);
    }
}

async function handleRestRequest(req, res, next) {
    try {
        const { schema, identifier } = req.params;
        const path = req.params[0]
        const query = req.query;
        const result = await RestRetriever.retrieve(schema, identifier, path, query);
        sendDataQueryResult(res, result);
    } catch (err) {
        next(err);
    }
}

async function handleRestListRequest(req, res, next) {
    try {
        const { schema } = req.params;
        const { type } = req.query;
        const result = await RestRetriever.discover(schema, type);
        sendDataQueryResult(res, result);
    } catch (err) {
        next(err);
    }
}

async function handleSnapshotFileRequest(req, res, next) {
    try {
        const { schema, tag } = req.params;
        const path = req.params[0];
        const m = /\.\w+$/.exec(path);
        if (!m) {
            return next();
        }
        const ext = m[0];

        const filename = Path.basename(path);
        if (path !== filename) {
            // direct to file as base location
            // this allows us to link to JS and CSS file using relative URL
            const originalURL = req.originalUrl;
            const folder = originalURL.substr(0, originalURL.length - path.length);
            const baseURL = folder + filename;
            res.redirect(301, baseURL);
            return;
        }

        const buffer = await SnapshotRetriever.retrieve(schema, tag, 'www', path);
        controlCache(res);
        res.type(ext).send(buffer);
    } catch (err) {
        next(err);
    }
}

async function handleSnapshotPageRequest(req, res, next) {
    try {
        const { lang } = req.query;
        if (!lang) {
            let selected = getPreferredLanguage(req);
            if (!selected) {
                selected = await getDefaultLanguage();
            }
            const uri = `${req.path}?lang=${selected}`;
            res.set({ 'X-Accel-Expires': 0 });
            res.set({ 'X-Accel-Redirect': uri });
            res.end();
            return;
        }

        const { schema, tag } = req.params;
        const path = req.params[0];
        const target = 'hydrate';
        const protocol = req.headers['x-forwarded-proto'];
        const host = req.headers.host;
        let baseURL = `${protocol}://${host}`;
        if (!req.redirected) {
            baseURL += `/srv/www/${schema}`;
        }
        const buffer = await PageGenerator.generate(schema, tag, path, baseURL, target, lang);
        controlCache(res);
        res.type('html').send(buffer);

        CacheManager.link(path, buffer.sourceURLs);
    } catch (err) {
        next(err);
    }
}

async function handleStaticFileRequest(req, res, next) {
    const isAdmin = _.startsWith(req.path, '/admin');
    try {
        const folder = (isAdmin) ? 'admin' : 'client';
        const file = req.params[0] || 'index.html';
        const path = Path.resolve(`../../${folder}/www/${file}`);
        const stats = await FS.stat(path);
        controlCache(res);
        res.sendFile(path);
    } catch (err) {
        if (err.code === 'ENOENT') {
            const uri = (isAdmin) ? `/admin/index.html` : `/index.html`;
            res.set({ 'X-Accel-Redirect': uri });
            res.end();
        } else {
            next(err);
        }
    }
}

async function handleMetadataRequest(req, res, next) {
    try {
        const { schema } = req.params;
        const project = ProjectSettings.find({ name: schema });
        if (!project) {
            throw new HTTPError(404);
        }
        const meta = {
            name: project.name,
            title: project.details.title,
        };
        controlCache(res);
        res.json(meta);
    } catch (err) {
        next(err);
    }
}

async function handleMediaRequest(req, res, next) {
    try {
        const path = req.params[0];
        const type = req.params.type;
        const uri = `/srv/media/${type}/${path}`;
        res.set('X-Accel-Redirect', uri);
        res.end();
    } catch (err) {
        next(err);
    }
}

function handleError(err, req, res, next) {
    if (!res.headersSent) {
        const status = err.status || err.statusCode || 400;
        res.type('text').status(status).send(err.message);
    }
    if (process.env.NODE_ENV !== 'production') {
        console.error(err);
    }
}

const defaultCacheControl = {
    'public': true,
    'max-age': 0,
    's-maxage': 24 * 60 * 60,
    'must-revalidate': true,
    'proxy-revalidate': false,
};

function controlCache(res, override) {
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
}

function sendDataQueryResult(res, result) {
    const { contents, cacheControl } = result;
    controlCache(res, cacheControl);
    res.json(contents);
}

function redirectToProject(req, res, next) {
    const host = req.headers.host;
    const project = ProjectSettings.find({ host });
    if (project) {
        if (_.startsWith(req.url, '/srv/www')) {
            req.redirected = true;
        } else {
            const uri = `/srv/www/${project.name}${req.url}`;
            res.set({ 'X-Accel-Redirect': uri });
            res.end();
            return;
        }
    } else {
        req.redirected = false;
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
        const { id, schema, table, diff, previous, current } = event;
        if (table === 'project') {
            if (diff.name || diff.repo_ids || diff.template_repo_id) {
                const name = previous.name || current.name;
                taskQueue.add(new TaskPurgeProject(name));
            }
            if (diff.name) {
                TrafficMonitor.moveStatistics(previous.name, current.name);
            }
            if (diff.name || diff.settings || diff.deleted) {
                ProjectSettings.update(db, id);
            }
        } else if (table === 'snapshot') {
            if (diff.head && !current.head) {
                taskQueue.add(new TaskPurgeSnapshotHead(id));
            }
        } else if (table === 'spreadsheet') {
            const name = previous.name || current.name;
            taskQueue.add(new TaskPurgeSpreadsheet(schema, name));

            if (diff.disabled || diff.deleted || diff.url) {
                if (!current.disabled && !current.deleted) {
                    taskQueue.add(new TaskImportSpreadsheet(schema, name))
                }
            }
        } else if (table === 'wiki') {
            const slug = previous.slug || current.slug;
            taskQueue.add(new TaskPurgeWiki(schema, slug));
        }
    }
}

async function getSearchParameters(req) {
    const text = req.query.search;
    if (!text) {
        return;
    }
    let lang = req.query.lang;
    if (lang) {
        lang = _.toLower(lang.substr(0, 2));
    } else {
        lang = await getDefaultLanguage();
    }
    return { text, lang };
}

function getPreferredLanguage(req) {
    const accepted = req.headers['accept-language'];
    const tokens = _.split(accepted, /\s*,\s*/);
    const list = _.map(tokens, (token) => {
        const m = /([^;]+);q=(.*)/.exec(token);
        if (m) {
            return { language: m[1], qFactor: parseFloat(m[2]) };
        } else {
            return { language: token, qFactor: 1 };
        }
    });
    const best = _.last(_.sortBy(list, 'qFactor'));
    if (best) {
        return best.language;
    }
}

async function getDefaultLanguage() {
    const db = await Database.open();
    const criteria = { deleted: false };
    const system = await System.findOne(db, 'global', criteria, '*');
    return Localization.getDefaultLanguageCode(system);
}

if ('file://' + process.argv[1] === import.meta.url) {
    start();
    Shutdown.addListener(stop);
}

export {
    start,
    stop,
};
