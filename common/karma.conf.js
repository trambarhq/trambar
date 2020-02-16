const Path = require('path');

module.exports = function(config) {
  config.set({
    port: 9876,
    colors: true,
    logLevel: config.LOG_WARNING,
    autoWatch: true,
    singleRun: false,
    browsers: [ 'Chrome' ],
    concurrency: 1,
    frameworks: [ 'chai', 'mocha', 'server-side' ],
    files: [
      'tests.bundle.js',
    ],
    client: {
      args: parseTestPattern(process.argv),
    },
    preprocessors: {
      'tests.bundle.js': [ 'webpack', 'sourcemap' ]
    },
    plugins: [
      'karma-chai',
      'karma-chrome-launcher',
      'karma-mocha',
      'karma-sourcemap-loader',
      'karma-webpack',
      'karma-server-side',
    ],
    reporters: [ 'progress' ],
    webpack: {
      mode: 'development',
      module: {
        rules: [
          {
            test: /\.(js|jsx|mjs)$/,
            loader: 'babel-loader',
            exclude: Path.resolve('./node_modules'),
            type: 'javascript/auto',
            query: {
              presets: [
                '@babel/env',
                '@babel/react',
              ],
              plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/transform-runtime',
              ]
            }
          },
          {
            test: /\.jpg|\.mp4/,
            loader: 'bin-loader',
          },
          {
            test: /\.scss$/,
            use: [
              'style-loader',
              'css-loader',
              'sass-loader',
            ]
          },
        ]
      },
      devtool: 'inline-source-map',
    },
    webpackMiddleware: {
      noInfo: true,
    },
  })
};

function parseTestPattern(argv) {
  var index = argv.indexOf('--');
  var patterns = (index !== -1) ? argv.slice(index + 1) : [];
  if (patterns.length > 0) {
    return [ '--grep' ].concat(patterns);
  } else {
    return [];
  }
}
