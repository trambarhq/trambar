const _ = require('lodash');
const Bluebird = require('bluebird');
const Express = require('express');
const BodyParser = require('body-parser');
const Multer = require('multer');
const CORS = require('cors');
const SockJS = require('sockjs');
const Crypto = Bluebird.promisifyAll(require('crypto'));

module.exports = {
  start,
  stop,
  send,
};

let server;
let serverPort;
let sockets = [];

async function start(port, options) {
  // set up handlers
  let app = Express();
  app.use(BodyParser.json());
  app.use(CORS());
  let storage = Multer.memoryStorage()
  let upload = Multer({ storage: storage });
  app.set('json spaces', 2);
  app.route('/echo').all(handleEchoRequest);
  app.route('/delay/:delay').all(handleDelayEchoRequest);

  app.route('/stream/:id').post(upload.single('file'), handleStreamUpload);
  app.route('/upload/:id/:part').post(upload.single('file'), handleFileUpload);
  app.route('/download/:id/:part').get(handleFileRetrieval);

  // set up SockJS server
  let sockJS = SockJS.createServer({
    sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.1.2/sockjs.min.js',
    log: (severity, message) => {
      if (severity === 'error') {
        console.error(message);
      }
    },
  });
  sockJS.on('connection', async (socket) => {
    if (socket) {
      sockets.push(socket);
      socket.on('close', () => {
        _.pull(sockets, socket);
      });

      // assign a random id to socket
      let buffer = await Crypto.randomBytesAsync(16);
      socket.token = buffer.toString('hex');
      socket.write(JSON.stringify({ socket: socket.token }));
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
      let connections = {};
      server.on('connection', function(conn) {
        let key = conn.remoteAddress + ':' + conn.remotePort;
        connections[key] = conn;
        conn.on('close', function() {
          delete connections[key];
        });
      });
      server.destroy = function(cb) {
        server.close(cb);
        for (let key in connections) {
          connections[key].destroy();
        }
      };
    } catch (err) {
      reject(err);
    }
  });
}

async function stop() {
  return new Promise((resolve, reject) => {
    if (server) {
      server.destroy(resolve);
      server = null;
      sockets = [];
    }
  });
}

function send(token, payload) {
  let socket = _.find(sockets, { token });
  if (socket) {
    socket.write(JSON.stringify(payload));
  }
}

function handleEchoRequest(req, res) {
  try {
    let input = (req.method === 'GET') ? req.query : req.body;
    res.json(input);
  } catch (err) {
    res.sendStatus(500);
  }
}

function handleDelayEchoRequest(req, res) {
  try {
    let delay = parseInt(req.params.delay);
    setTimeout(() => {
      res.json(req.body);
    }, delay);
  } catch (err) {
    res.sendStatus(500);
  }
}

let files = {};

function handleFileUpload(req, res) {
  try {
    let payloadID = req.params.id;
    let part = req.params.part;
    let key = payloadID + '/' + part;
    if (req.file) {
      let buffer = req.file.buffer;
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

let streams = {};

function handleStreamUpload(req, res) {
  try {
    let streamID = req.params.id;
    if (req.file) {
      let buffer = req.file.buffer;
      let stream = streams[streamID];
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
    let payloadID = req.params.id;
    let part = req.params.part;
    let key = payloadID + '/' + part;
    let buffer = files[key];
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
