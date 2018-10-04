var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var Multer = require('multer');
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
    var storage = Multer.memoryStorage()
    var upload = Multer({ storage: storage });
    app.set('json spaces', 2);
    app.route('/echo').all(handleEchoRequest);
    app.route('/delay/:delay').all(handleDelayEchoRequest);

    app.route('/stream/:id').post(upload.single('file'), handleStreamUpload);
    app.route('/upload/:id/:part').post(upload.single('file'), handleFileUpload);
    app.route('/download/:id/:part').get(handleFileRetrieval);

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

var files = {};

function handleFileUpload(req, res) {
    try {
        var payloadID = req.params.id;
        var part = req.params.part;
        var key = payloadID + '/' + part;
        if (req.file) {
            var buffer = req.file.buffer;
            files[key] = buffer;
        } else if (req.body.stream) {
            files[key] = req.body.stream;
        }
        res.json({
            url: `/download/${key}`
        });
    } catch (err) {
        console.error(err);
        res.sendStatus(400);
    }
}

var streams = {};

function handleStreamUpload(req, res) {
    try {
        var streamID = req.params.id;
        if (req.file) {
            var buffer = req.file.buffer;
            var stream = streams[streamID];
            if (stream) {
                streams[streamID] = Buffer.concat([ stream, buffer ]);
            } else {
                streams[streamID] = buffer;
            }
        }
        res.json({});
    } catch (err) {
        console.error(err);
        res.sendStatus(400);
    }
}

function handleFileRetrieval(req, res) {
    try {
        var payloadID = req.params.id;
        var part = req.params.part;
        var key = payloadID + '/' + part;
        var buffer = files[key];
        if (typeof(buffer) === 'string') {
            buffer = streams[buffer];
        }
        if (buffer) {
            res.send(buffer);
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        console.error(err);
        res.sendStatus(400);
    }
}
