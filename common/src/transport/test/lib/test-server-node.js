const Express = require('express');
const BodyParser = require('body-parser');
const Multer = require('multer');
const CORS = require('cors');
const SockJS = require('sockjs');
const Util = require('util');
const Crypto = require('crypto');

const randomBytes = Util.promisify(Crypto.randomBytes);

module.exports = {
  start,
  stop,
  send,
};

let server;
let serverPort;
let sockets = [];
let files = {};
let streams = {};

async function start(port, options) {
  // set up handlers
  const app = Express();
  app.use(BodyParser.json());
  app.use(CORS());
  const storage = Multer.memoryStorage()
  const upload = Multer({ storage: storage });
  app.set('json spaces', 2);
  app.route('/echo').all(handleEchoRequest);
  app.route('/delay/:delay').all(handleDelayEchoRequest);

  app.route('/stream/:id').post(upload.single('file'), handleStreamUpload);
  app.route('/upload/:id/:part').post(upload.single('file'), handleFileUpload);
  app.route('/download/:id/:part').get(handleFileRetrieval);

  // set up SockJS server
  const sockJS = SockJS.createServer({
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
        sockets.splice(sockets.indexOf(socket), 1);
      });

      // assign a random id to socket
      const buffer = await randomBytes(16);
      socket.token = buffer.toString('hex');
      socket.write(JSON.stringify({ socket: socket.token }));
    }
  });

  // start up server
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(port, () => resolve());
      serverPort = port;

      // install SockJS
      sockJS.installHandlers(server, { prefix: '/socket' });

      // break connections on shutdown
      const connections = {};
      server.on('connection', function(conn) {
        const key = conn.remoteAddress + ':' + conn.remotePort;
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
  const socket = sockets.find(s => s.token === token);
  if (socket) {
    socket.write(JSON.stringify(payload));
  }
}

function handleEchoRequest(req, res) {
  try {
    const input = (req.method === 'GET') ? req.query : req.body;
    res.json(input);
  } catch (err) {
    res.sendStatus(500);
  }
}

function handleDelayEchoRequest(req, res) {
  try {
    const delay = parseInt(req.params.delay);
    setTimeout(() => {
      res.json(req.body);
    }, delay);
  } catch (err) {
    res.sendStatus(500);
  }
}

function handleFileUpload(req, res) {
  try {
    const payloadID = req.params.id;
    const part = req.params.part;
    const key = payloadID + '/' + part;
    if (req.file) {
      const buffer = req.file.buffer;
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

function handleStreamUpload(req, res) {
  try {
    const streamID = req.params.id;
    if (req.file) {
      const buffer = req.file.buffer;
      const stream = streams[streamID];
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
    const payloadID = req.params.id;
    const part = req.params.part;
    const key = payloadID + '/' + part;
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
