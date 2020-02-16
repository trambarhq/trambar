const _ = require('lodash');
const Path = require('path');
const FS = require('fs');
const Webpack = require('webpack');

// plugins
const HtmlWebpackPlugin = require('html-webpack-plugin');
const DefinePlugin = Webpack.DefinePlugin;
const ContextReplacementPlugin = Webpack.ContextReplacementPlugin;
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCSSExtractPlugin = require('mini-css-extract-plugin');

let event = 'build';
if (process.env.npm_lifecycle_event) {
  event = process.env.npm_lifecycle_event;
}

const folders = _.mapValues({
  context: 'src',
  output: 'www',
  assets: 'assets',
  commonCode: '../common/src',
  commonAssets: '../common/assets',
  modules: [ 'node_modules', '../common/node_modules' ],
}, resolve);
if (event !== 'start') {
  console.log(`Output folder: ${folders.output}`);
  try {
    if (FS.lstatSync(folders.output).isSymbolicLink()) {
      const actualFolder = FS.readlinkSync(folders.output);
      console.log(`Actual output folder: ${actualFolder}`);
    }
  } catch (err) {
  }
}

const pkg = readJSON('./package.json');

const env = {
  PLATFORM: 'browser',
  VERSION: pkg.version,
  NODE_ENV: (event === 'build') ? 'production' : 'development',
};
const constants = {};
_.each(env, (value, name) => {
  constants[`process.env.${name}`] = JSON.stringify(String(value));
});

// get list of external libraries
const libraries = parseLibraryList(`${folders.context}/libraries.mjs`);

module.exports = {
  mode: env.NODE_ENV,
  context: folders.context,
  entry: './main.mjs',
  output: {
    path: folders.output,
    filename: '[name].js?[hash]',
    chunkFilename: '[name].js?[chunkhash]',
  },
  resolve: {
    modules: folders.modules,
    alias: {
      'common': folders.commonCode,
      'common-assets': folders.commonAssets,
      'context': folders.context,
    }
  },
  resolveLoader: {
    modules: folders.modules,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|mjs)$/,
        loader: 'babel-loader',
        exclude: function(path) {
          if (/node_modules/.test(path)) {
            if (!/trambar\-www/.test(path)) {
              return true;
            }
          }
        },
        type: 'javascript/auto',
        query: {
          presets: [
            '@babel/env',
            '@babel/react',
          ].map(resolvePreset),
          plugins: [
            '@babel/proposal-class-properties',
            '@babel/proposal-nullish-coalescing-operator',
            '@babel/proposal-optional-chaining',
            '@babel/transform-runtime',
          ].map(resolvePlugin),
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCSSExtractPlugin.loader,
          'css-loader',
        ],
      },
      {
        test: /\.scss$/,
        use: [
          MiniCSSExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ],
      },
      {
        test: /\.md$/,
        loader: 'raw-loader',
      },
      {
        test: /fonts.*\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'file-loader',
      },
      {
        test: /fonts.*\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'file-loader',
        query: {
          emitFile: false,
        }
      },
      {
        test: /\.svg$/,
        loader: 'svg-react-loader',
        exclude: /fonts/,
        query: {
          filters: [
            // strip out the dimension
            function (value) {
              if (value.tagname === 'svg') {
                delete value.props.width;
                delete value.props.height;
              }
            }
          ]
        }
      },
      {
        test: /\.(jpeg|jpg|png|gif)$/,
        loader: 'file-loader',
      },
      {
        test: /\.(zip)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]'
        }
      },
    ]
  },
  plugins: [
    new DefinePlugin(constants),
    new HtmlWebpackPlugin({
      template: `${folders.assets}/index.html`,
      filename: `${folders.output}/index.html`,
      version: env.VERSION,
    }),
    new MiniCSSExtractPlugin({
      filename: "[name].css?[hash]",
      chunkFilename: "[id].css?[hash]"
    }),
    new ContextReplacementPlugin(/moment[\/\\]locale$/, /zz/),
    new BundleAnalyzerPlugin({
      analyzerMode: (event === 'build') ? 'static' : 'disabled',
      reportFilename: `../report_admin.html`,
    }),
  ],
  optimization: {
    splitChunks: {
      cacheGroups: _.mapValues(libraries, (modules, name) => {
        return {
          test: new RegExp(`\\b${modules.join('|')}\\b`),
          name: name,
          chunks: 'all',
          enforce: true
        };
      }),
    },
  },
  stats: {
    warningsFilter: (warning) => {
      return /Conflicting order between/i.test(warning);
    },
  },
  devtool: (event === 'build') ? 'source-map' : 'inline-source-map',
  devServer: {
    inline: true,
    open: true,
    historyApiFallback: {
      index: '/admin/'
    },
    publicPath: '/admin'
  }
};

function readJSON(path) {
  const text = FS.readFileSync(path);
  try {
    return JSON.parse(text);
  } catch(err) {
    return {};
  }
}

function resolve(path) {
  if (_.isArray(path)) {
    return _.map(path, resolve);
  } else {
    return Path.resolve(`${__dirname}/${path}`);
  }
}

function parseLibraryList(path) {
  const code = FS.readFileSync(path, { encoding: 'utf8' });
  const libraries = {};
  const re1 = /'([^']+)':.*?{([^}]*)}/g;
  let m1;
  while (m1 = re1.exec(code)) {
    const name = m1[1];
    const modules = [];
    const re2 = /import\('(.*)'\)/g;
    let m2;
    while (m2 = re2.exec(m1[2])) {
      modules.push(m2[1]);
    }
    libraries[name] = modules;
  }
  return libraries;
}

function resolveBabel(name, type) {
  if (name instanceof Array) {
    name = name.slice();
    name[0] = resolveBabel(name[0], type);
    return name;
  }
  if (_.startsWith(name, '@babel/') && !_.startsWith(name, '@babel/' + type + '-')) {
    name = name.replace('/', '/' + type + '-');
  } else if (!_.startsWith(name, 'babel-' + type + '-')) {
    name = name.replace('', 'babel-' + type + '-');
  }
  const path = _.reduce(folders.modules, (path, folder) => {
    if (!path) {
      path = folder + '/' + name;
      if (!FS.existsSync(path)) {
        path = null;
      }
    }
    return path;
  }, null);
  return path || name;
}

function resolvePreset(name) {
  return resolveBabel(name, 'preset');
}

function resolvePlugin(name) {
  return resolveBabel(name, 'plugin');
}
