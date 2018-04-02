var HTTPRequest = require('transport/http-request');

var address = `http://192.168.0.53:8585`;

_.each([ 'log', 'error', 'warn' ], (name) => {
    console[name] = function(...args) {
        HTTPRequest.fetch('post', address, args, { contentType: 'json' });
    }
});
