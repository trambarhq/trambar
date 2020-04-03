import Server from 'karma-server-side';

export const TestServer = {
  start(port, options) {
    return Server.run(port, options || {}, function(port, options) {
      const TestServer = serverRequire('./src/transport/test/lib/test-server-node');
      return TestServer.start(port, options);
    });
  },
  stop() {
    return Server.run(function() {
      const TestServer = serverRequire('./src/transport/test/lib/test-server-node');
      return TestServer.stop();
    });
  },
  send(token, payload) {
    return Server.run(token, payload, function(token, payload) {
      const TestServer = serverRequire('./src/transport/test/lib/test-server-node');
      return TestServer.send(token, payload);
    });
  },
  reset(options) {
    return Server.run(options || {}, function(options) {
      const TestServer = serverRequire('./src/transport/test/lib/test-server-node');
      return TestServer.reset(options);
    });
  },
};
