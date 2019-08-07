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
import HTTPError from './lib/common/errors/http-error.mjs';

import * as CacheManager from './lib/www-handler/cache-manager.mjs';
import * as ExcelRetriever from './lib/www-handler/excel-retriever.mjs';
import * as PageGenerator from './lib/www-handler/page-generator.mjs';
import * as ProjectSettings from './lib/www-handler/project-settings.mjs';
import * as SnapshotRetriever from './lib/www-handler/snapshot-retriever.mjs';
import * as TrafficMonitor from './lib/www-handler/traffic-monitor.mjs';
import * as WikiRetriever from './lib/www-handler/wiki-retriever.mjs';

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

const folder = Path.dirname(URL.fileURLToPath(import.meta.url));
const clientFolder = Path.resolve(`${folder}/../../client/www`);
const adminFolder = Path.resolve(`${folder}/../../admin/www`);

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
    app.get('/srv/www/:schema/geoip', handleGeoIPRequest);
    app.get('/srv/www/:schema/wiki/:repoName/:slug', handleWikiRequest);
    app.get('/srv/www/:schema/wiki/:repoName', handleWikiListRequest);
    app.get('/srv/www/:schema/wiki', handleWikiListRequest);
    app.get('/srv/www/:schema/excel/:name', handleExcelRequest);
    app.get('/srv/www/:schema/excel', handleExcelListRequest);
    app.get('/srv/www/:schema/meta', handleMetadataRequest);
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
        const { schema, repoName, slug } = req.params;
        const wiki = await WikiRetriever.retrieve(schema, repoName, slug);
        const data = exportWiki(wiki, repoName);
        controlCache(res);
        res.json(data);
    } catch (err) {
        next(err);
    }
}

async function handleWikiListRequest(req, res, next) {
    try {
        const { schema, repoName } = req.params;
        const { prefix } = req.query;
        const entries = await WikiRetriever.discover(schema, repoName, prefix);
        const urls = entries.map((entry) => {
            const { repo, slug } = entry;
            return `wiki/${repo}/${slug}`;
        });
        controlCache(res);
        res.json(urls);
    } catch (err) {
        next(err);
    }
}

async function handleExcelRequest(req, res, next) {
    try {
        const { schema, name } = req.params;
        const spreadsheet = await ExcelRetriever.retrieve(schema, name);
        const data = exportSpreadsheet(spreadsheet);
        controlCache(res, { 's-maxage': 10 }, spreadsheet.etag);
        res.json(data);
    } catch (err) {
        next(err);
    }
}

async function handleExcelListRequest(req, res, next) {
    try {
        const { schema } = req.params;
        const { prefix } = req.query;
        const entries = await ExcelRetriever.discover(schema, prefix);
        const urls = entries.map((entries) => {
            const { name } = entries;
            return `excel/${name}`;
        });
        controlCache(res);
        res.json(urls);
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
        const { schema, tag } = req.params;
        const path = req.params[0];
        const buffer = await PageGenerator.generate(schema, tag, path);
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
        const folder = (isAdmin) ? adminFolder : clientFolder;
        const file = req.params[0];
        const path = `${folder}/${file}`;
        const stats = await FS.stat(path);
        controlCache(res);
        res.sendFile(path);
    } catch (err) {
        if (err.code === 'ENOENT') {
            const uri = (isAdmin) ? `/admin/index.html` : `/index.html`;
            res.set('X-Accel-Redirect', uri).end();
        } else {
            next(err);
        }
    }
}

async function handleMetadataRequest(req, res, next) {
    try {
        const { schema } = req.params;
        const project = ProjectSettings.find({ name: schema });
        console.log(schema, project);
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
        res.set('X-Accel-Redirect', uri).end();
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

function exportWiki(wiki, repoName) {
    const resources = _.get(wiki, 'details.resources', []);
    for (let resource of resources) {
        trimURL(resource);
    }
    return {
        repo: repoName,
        slug: _.get(wiki, 'slug', ''),
        title: _.get(wiki, 'details.title', ''),
        markdown: _.get(wiki, 'details.content', ''),
        resources: _.get(wiki, 'details.resources', ''),
    };
}

function exportSpreadsheet(spreadsheet) {
    const sheets = _.get(spreadsheet, 'details.sheets', []);
    for (let sheet of sheets) {
        for (let row of sheet.rows) {
            for (let cell of row) {
                if (cell.url) {
                    trimURL(cell);
                }
            }
        }
    }
    return {
        name: _.get(spreadsheet, 'name', ''),
        title: _.get(spreadsheet, 'details.title', ''),
        description: _.get(spreadsheet, 'details.description', ''),
        subject: _.get(spreadsheet, 'details.subject', ''),
        keywords: _.get(spreadsheet, 'details.keywords', []),
        sheets: _.get(spreadsheet, 'details.sheets', []),
    };
}

const mediaBaseURL = '/srv/media/';

function trimURL(res) {
    if (_.startsWith(res.url, mediaBaseURL)) {
        res.url = res.url.substr(mediaBaseURL.length);
    }
}

const defaultCacheControl = {
    'public': true,
    'max-age': 0,
    's-maxage': 24 * 60 * 60,
    'must-revalidate': true,
    'proxy-revalidate': false,
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

function redirectToProject(req, res, next) {
    const host = req.headers.host;
    const project = ProjectSettings.find({ host });
    if (project) {
        if (_.startsWith(req.url, '/srv/www')) {
            req.redirected = true;
        } else {
            const uri = `/srv/www/${project.name}${req.url}`;
            res.set('X-Accel-Redirect', uri).end();
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

if ('file://' + process.argv[1] === import.meta.url) {
    start();
    Shutdown.addListener(stop);
}

export {
    start,
    stop,
};
