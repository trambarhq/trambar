import _ from 'lodash';
import Express from 'express';
import CORS from 'cors';
import BodyParser from 'body-parser';
import Moment from 'moment';
import DNSCache from 'dnscache';
import Database from 'database';
import * as Shutdown from 'shutdown';

import * as ExcelRetriever from 'www-handler/excel-retriever';

let server;

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

async function start() {
    // start up Express
    let app = Express();
    app.use(CORS());
    app.use(BodyParser.json());
    app.set('json spaces', 2);
    app.get('/srv/www/:schema/wiki/:slug?', handleWikiRequest);
    app.get('/srv/www/:schema/excel/:name?', handleExcelRequest);
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
}

async function stop() {
    await Shutdown.close(server);
}

async function handlePageRequest(req, res, next) {
    try {
        res.type('html').send('<h1>Hello world</h1>');
    } catch (err) {
        next(err);
    }
}

async function handleWikiRequest(req, res, next) {
    try {
        res.type('text').send('Markdown text');
    } catch (err) {
        next(err);
    }
}

async function handleExcelRequest(req, res, next) {
    try {
        let db = await Database.open();
        let { schema, name } = req.params;
        let spreadsheet = await ExcelRetriever.fetch(db, schema, name);
        controlCache(res, { 's-maxage': 5 }, spreadsheet.etag);
        res.json(spreadsheet.details.data);

        if (spreadsheet.changed) {

        }
    } catch (err) {
        next(err);
    }
}

function handleError(err, req, res, next) {
    if (!res.headersSent) {
        let status = err.status || err.statusCode || 400;
        res.type('text').status(status).send(err.message);
    } else {
        console.error(err);
    }
}

const DEFAULT_CACHE_CONTROL = {
    'public': true,
    'max-age': 0,
    's-maxage': 60,
    'must-revalidate': true,
    'proxy-revalidate': true,
};

function controlCache(res, override, etag) {
    let params = _.assign({}, DEFAULT_CACHE_CONTROL, override);
    let items = [];
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

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
