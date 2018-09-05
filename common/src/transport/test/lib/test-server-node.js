var Express = require('express');
var BodyParser = require('body-parser');
var CORS = require('cors');

module.exports = {
    start,
    stop,
};

var server;
var serverPort;

function start(port, options) {
    // set up handlers
    var app = Express();
    app.use(BodyParser.json());
    app.use(CORS());
    app.set('json spaces', 2);
    app.route('/echo').all(handleEchoRequest);
    app.route('/delay/:delay').all(handleDelayEchoRequest);

    // start up server
    return new Promise((resolve, reject) => {
        try {
            server = app.listen(port, resolve);
            serverPort = port;

            // break connections on shutdown
            var connections = {};
            server.on('connection', function(conn) {
                var key = conn.remoteAddress + ':' + conn.remotePort;
                connections[key] = conn;
                conn.on('close', function() {
                    delete connections[key];
                });
            });
            server.destroy = function(cb) {
                server.close(cb);
                for (var key in connections) {
                    connections[key].destroy();
                }
            };
        } catch (err) {
            reject(err);
        }
    });
}

function stop() {
    return new Promise((resolve, reject) => {
        if (server) {
            server.destroy(resolve);
            server = null;
        }
    });
}

function handleEchoRequest(req, res) {
    try {
        var input = (req.method === 'GET') ? req.query : req.body;
        res.json(input);
    } catch (err) {
        res.sendStatus(500);
    }
}

function handleDelayEchoRequest(req, res) {
    try {
        var delay = parseInt(req.params.delay);
        setTimeout(() => {
            res.json(req.body);
        }, delay);
    } catch (err) {
        res.sendStatus(500);
    }
}
