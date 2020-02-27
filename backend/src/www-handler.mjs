import _ from 'lodash';
import './lib/common/utils/lodash-extra.mjs';
import Moment from 'moment';
import OS from 'os';
import { promises as FS } from 'fs';
import { promises as DNS } from 'dns';
import Netmask from 'netmask';
import Path from 'path';
import QueryString from 'querystring';
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
  TaskPurgeTemplate,
  TaskPurgeProject,
  TaskPurgeChangedDomains,
  TaskPurgeMetadata,
  TaskPurgeSpreadsheet,
  TaskPurgeWiki,
  TaskPurgeRest,
  TaskPurgeRequest,
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
    exposedHeaders: [
      'etag',
      'X-Cache-Status',
      'X-Total',
      'X-Total-Pages',
    ],
  };
  app.set('json spaces', 2);
  app.use(CORS(corsOptions));
  app.use(Compression());
  app.get('*', addTrailingSlash);
  app.get('*', matchProjectDomain);
  app.get('*', redirectToCanonical);
  app.get('*', handleStaticFileRequest);
  app.get('/.cache', handleCacheStatusRequest);
  app.get('/data/geoip/', handleGeoIPRequest);
  app.get('/data/wiki/:identifier/:slug/', handleWikiRequest);
  app.get('/data/wiki/:identifier/', handleWikiListRequest);
  app.get('/data/wiki/', handleWikiListRequest);
  app.get('/data/excel/:identifier/', handleExcelRequest);
  app.get('/data/excel/', handleExcelListRequest);
  app.get('/data/rest/:identifier/*', handleRestRequest);
  app.get('/data/rest/', handleRestListRequest);
  app.get('/data/meta/', handleMetadataRequest);
  app.get('/:type(images|video|audio)/*', handleMediaRequest);
  app.get('/\\(:tag\\)/*', handleSnapshotFileRequest);
  app.get('/*', handleSnapshotFileRequest);
  app.get('/\\(:tag\\)/*', handleSnapshotPageRequest);
  app.get('/*', handleSnapshotPageRequest);
  app.purge('*', handlePurgeRequest);

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
    'rest',
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
    const { project } = req;
    const options = { md5: !!req.query.md5 };
    const text = await CacheManager.stat(project, options);
    res.set({ 'X-Accel-Expires': 0 });
    res.type('text').send(text);
  } catch (err) {
    next(err);
  }
}

async function handleGeoIPRequest(req, res, next) {
  try {
    const { project } = req;
    //const ip = req.headers['x-forwarded-for'];
    const ip = '213.171.195.48';
    if (!ip) {
      throw new Error('Nginx did not send X-Forwarded-For header');
    }
    const country = await TrafficMonitor.recordIP(project, ip);
    res.set({ 'X-Accel-Expires': 0 });
    res.json({ country });
  } catch (err) {
    next(err);
  }
}

async function handleWikiRequest(req, res, next) {
  try {
    const { project } = req;
    const { identifier, slug } = req.params;
    const result = await WikiRetriever.retrieve(project, identifier, slug);
    sendDataQueryResult(res, result);
  } catch (err) {
    next(err);
  }
}

async function handleWikiListRequest(req, res, next) {
  try {
    const { project } = req;
    const { identifier } = req.params;
    const search = await getSearchParameters(req);
    const result = await WikiRetriever.discover(project, identifier, search);
    sendDataQueryResult(res, result);
  } catch (err) {
    next(err);
  }
}

async function handleExcelRequest(req, res, next) {
  try {
    const { project } = req;
    const { identifier } = req.params;
    const result = await ExcelRetriever.retrieve(project, identifier);
    sendDataQueryResult(res, result);
  } catch (err) {
    next(err);
  }
}

async function handleExcelListRequest(req, res, next) {
  try {
    const { project } = req;
    const search = await getSearchParameters(req);
    const result = await ExcelRetriever.discover(project, search);
    sendDataQueryResult(res, result);
  } catch (err) {
    next(err);
  }
}

async function handleRestRequest(req, res, next) {
  try {
    const { project } = req;
    const { identifier } = req.params;
    const path = req.params[0]
    const query = req.query;
    const result = await RestRetriever.retrieve(project, identifier, path, query);
    sendDataQueryResult(res, result);
  } catch (err) {
    next(err);
  }
}

async function handleRestListRequest(req, res, next) {
  try {
    const { project } = req;
    const { type } = req.query;
    const result = await RestRetriever.discover(project, type);
    sendDataQueryResult(res, result);
  } catch (err) {
    next(err);
  }
}

async function handleSnapshotFileRequest(req, res, next) {
  try {
    const { project } = req;
    const { tag } = req.params;
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

    const buffer = await SnapshotRetriever.retrieve(project, tag, 'www', path);
    controlCache(res);
    if (buffer) {
      res.type(ext).send(buffer);
    } else {
      res.sendStatus(204);
    }
  } catch (err) {
    next(err);
  }
}

async function handleSnapshotPageRequest(req, res, next) {
  try {
    const { project } = req;
    const { lang } = req.query;
    if (!lang) {
      let selected = getPreferredLanguage(req);
      if (!selected) {
        selected = await getDefaultLanguage();
      }
      const vars = { ...req.query, lang: selected };
      const qs = QueryString.stringify(vars);
      const originalPath = _.replace(req.originalUrl, /\?.*/, '');
      let uri = `${originalPath}?${qs}`;
      res.set({ 'X-Accel-Expires': 0 });
      res.set({ 'X-Accel-Redirect': uri });
      res.end();
      return;
    }

    const { tag } = req.params;
    const qs = QueryString.stringify(_.omit(req.query, 'lang'));
    const pageURL = `/${req.params[0]}${qs ? `?${qs}` : ''}`;
    const target = 'hydrate';
    const protocol = req.headers['x-forwarded-proto'];
    const host = req.headers.host;
    const baseURL = `${protocol}://${host}${req.basePath}`;
    const buffer = await PageGenerator.generate(project, tag, pageURL, baseURL, target, lang);
    if (buffer.statusCode == 200) {
      controlCache(res);
    } else {
      res.status(buffer.statusCode);
    }
    res.type('html').send(buffer);

    // link the URLs used by the page to its URL
    // so it gets purged when the data it uses gets purged
    CacheManager.link(project, req.url, buffer.sourceURLs);
  } catch (err) {
    next(err);
  }
}

async function handleMetadataRequest(req, res, next) {
  try {
    const { name, details, archived } = req.project;
    const { title, description } = details;
    const meta = {
      identifier: name,
      title: convertMultilingualText(title),
      description: convertMultilingualText(description),
      archived,
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

async function handlePurgeRequest(req, res, next) {
  try {
    const url = req.url;
    const method = req.headers['x-purge-method'];
    let host = req.headers['x-forwarded-host'];
    if (!host) {
      host = req.headers.host;
    }
    let ip = req.headers['x-forwarded-for'];
    if (!ip) {
      ip = req.connection.remoteAddress;
    }
    if (_.startsWith(ip, '::ffff:')) {
      // remove IP4 -> IP6 prefix
      ip = ip.substr(7);
    }
    if (await validatePurgeRequest(host, ip)) {
      taskQueue.add(new TaskPurgeRequest(host, url, method));
    }
    res.end();
  } catch (err) {
    next(err);
  }
}

async function validatePurgeRequest(host, ip) {
  // allow a request if it's comes from the same subnet
  // (i.e. from another Docker container)
  const ifaces = OS.networkInterfaces();
  for (let [ ifname, addresses ] of _.entries(ifaces)) {
    for (let address of addresses) {
      if (address.family === 'IPv4') {
        const block = new Netmask.Netmask(address.cidr);
        if (block.contains(ip)) {
          return true;
        }
      }
    }
  }

  // require request to have come from the specified host
  try {
    const hostIP = await DNS.resolve4(host);
    if (hostIP === ip) {
      return true;
    }
  } catch (err) {
  }
  return false;
}

function handleError(err, req, res, next) {
  if (!res.headersSent) {
    const status = err.status || err.statusCode || 400;
    res.type('text').status(status).send(err.message);
  }
  console.log(err.stack);
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
  if (contents instanceof Array) {
    if (typeof(contents.total) === 'number') {
      res.set({ 'X-Total': contents.total });
    }
    if (typeof(contents.pages) === 'number') {
      res.set({ 'X-Total-Pages': contents.pages });
    }
  }
  res.json(contents);
}

function addTrailingSlash(req, res, next) {
  const { path, url } = req;
  if (!_.endsWith(path, '/')) {
    if (!Path.extname(path)) {
      res.redirect(301, `${path}/${url.substr(path.length)}`);
      return;
    }
  }
  next();
}

function matchProjectDomain(req, res, next) {
  const { host } = req.headers;
  let project = ProjectSettings.find({ host });
  let basePath = '';
  if (!project) {
    const m = /^\/srv\/www\/(\w+)\/?/.exec(req.url);
    if (m) {
      const name = m[1];
      project = ProjectSettings.find({ name });
      if (project) {
        basePath = `/srv/www/${name}`;
        req.url = req.url.substr(basePath.length);
      }
    }
  }
  req.project = project;
  req.basePath = basePath;
  next();
}

function redirectToCanonical(req, res, next) {
  const { project } = req;
  if (project) {
    const { host } = req.headers;
    const [ primary ] = project.settings.domains || [];
    if (primary && primary !== host) {
      res.redirect(301, `//${primary}${req.url}`);
      return;
    }
  }
  next();
}

async function handleStaticFileRequest(req, res, next) {
  if (req.project) {
    next();
    return;
  }
  const isAdmin = _.startsWith(req.path, '/admin/');
  try {
    const folder = (isAdmin) ? 'admin' : 'client';
    const file = Path.basename(req.path) || 'index.html';
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

/**
 * Called when changes occurs in the database
 *
 * @param  {Array<Object>} events
 */
async function handleDatabaseChanges(events) {
  const db = this;
  for (let event of events) {
    const { id, schema, table, diff, previous, current } = event;
    if (table === 'project') {
      const projectBefore = ProjectSettings.find({ id });
      await ProjectSettings.update(db, id);
      const projectAfter = ProjectSettings.find({ id });

      if (diff.settings) {
        taskQueue.add(new TaskPurgeChangedDomains(projectBefore, projectAfter));
      }
      if (diff.name || diff.repo_ids || diff.template_repo_id) {
        if (projectBefore) {
          taskQueue.add(new TaskPurgeProject(projectBefore));
        }
      } else if (diff.details || diff.archived) {
        if (projectBefore) {
          taskQueue.add(new TaskPurgeMetadata(projectBefore));
        }
      }
      if (diff.name) {
        TrafficMonitor.moveStatistics(previous.name, current.name);
      }
    } else if (table === 'snapshot') {
      if (diff.head && !current.head) {
        const repoID = current.repo_id;
        taskQueue.add(new TaskPurgeTemplate(repoID));
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
      const repoID = current.repo_id;
      taskQueue.add(new TaskPurgeWiki(schema, repoID, slug));
    } else if (table === 'rest') {
      const name = previous.name || current.name;
      taskQueue.add(new TaskPurgeRest(schema, name));
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

function convertMultilingualText(langText) {
  const json = [];
  if (langText instanceof Object) {
    const entries = Object.entries(langText);
    for (let [ lang, text ] of entries) {
      // add heading when there're multiple languages
      if (entries.length > 1) {
        const heading = `(${lang})`;
        json.push({ type: 'h1', children: [ heading ] });
      }
      json.push(text);
    }
  }
  return { json };
}

if ('file://' + process.argv[1] === import.meta.url) {
  start();
  Shutdown.addListener(stop);
}

export {
  start,
  stop,
};
