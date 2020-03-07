import { performHTTPRequest } from '../transport/http-request.js';

const address = `http://192.168.0.53:8585`;

_.each([ 'log', 'error', 'warn' ], (name) => {
  console[name] = function(...args) {
    performHTTPRequest('post', address, args, { contentType: 'json' });
  }
});
