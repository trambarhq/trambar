import Express from 'express';
import CORS from 'cors';
import BodyParser from 'body-parser';
import Moment from 'moment';
import DNSCache from 'dnscache';

import * as Shutdown from 'shutdown';

let server;

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

async function start() {
    // start up Express
    let app = Express();
    app.use(CORS());
    app.use(BodyParser.json());
    app.set('json spaces', 2);
    app.get('/srv/www/wiki/:slug?', handleWikiRequest);
    app.get('/srv/www/excel/:file?', handleExcelRequest);
    app.get('/srv/www/*', handlePageRequest);
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
        res.json({ excel: true });
    } catch (err) {
        next(err);
    }
}

function handleError(err, req, res, next) {
    if (!res.headersSent) {
        let status = err.status || err.statusCode || 400;
        res.type('text').status(status).send(err.message);
    }
    console.error(err);
}

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
