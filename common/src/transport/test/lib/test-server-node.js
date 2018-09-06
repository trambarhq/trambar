var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var CORS = require('cors');
var SockJS = require('sockjs');
var Crypto = Promise.promisifyAll(require('crypto'));

module.exports = {
    start,
    stop,
    send,
};

var server;
var serverPort;
var sockets = [];

function start(port, options) {
    // set up handlers
    var app = Express();
    app.use(BodyParser.json());
    app.use(CORS());
    app.set('json spaces', 2);
    app.route('/echo').all(handleEchoRequest);
    app.route('/delay/:delay').all(handleDelayEchoRequest);

    // set up SockJS server
    var sockJS = SockJS.createServer({
        sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.1.2/sockjs.min.js',
        log: (severity, message) => {
            if (severity === 'error') {
                console.error(message);
            }
        },
    });
    sockJS.on('connection', (socket) => {
        if (socket) {
            sockets.push(socket);
            socket.on('close', () => {
                _.pull(sockets, socket);
            });

            // assign a random id to socket
            return Crypto.randomBytesAsync(16).then((buffer) => {
                socket.token = buffer.toString('hex');
                socket.write(JSON.stringify({ socket: socket.token }));
            });
        }
    });

    // start up server
    return new Promise((resolve, reject) => {
        try {
            server = app.listen(port, resolve);
            serverPort = port;

            // install SockJS
            sockJS.installHandlers(server, { prefix: '/socket' });

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
            sockets = [];
        }
    });
}

function send(token, payload) {
    var socket = _.find(sockets, { token });
    if (socket) {
        socket.write(JSON.stringify(payload));
    }
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
