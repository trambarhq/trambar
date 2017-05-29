var Http = require('http');
var SockJs = require('sockjs');

var sockJs = SockJs.createServer({
    sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js'
});
sockJs.on('connection', function(conn) {
    conn.on('data', function(message) {
        conn.write(message);
    });
    conn.on('close', function() {

    });
});

var server = Http.createServer();
sockJs.installHandlers(server, { prefix:'/socket' });
server.listen(80, '0.0.0.0');
