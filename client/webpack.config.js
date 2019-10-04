var _ = require('lodash');
var Path = require('path');
var FS = require('fs');
var Webpack = require('webpack');

// plugins
var HtmlWebpackPlugin = require('html-webpack-plugin');
var DefinePlugin = Webpack.DefinePlugin;
var ContextReplacementPlugin = Webpack.ContextReplacementPlugin;
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
var MiniCSSExtractPlugin = require('mini-css-extract-plugin');

var event = 'build';
var platform = 'browser';
var os;
if (process.env.npm_lifecycle_event) {
    event = process.env.npm_lifecycle_event;
    var argv = JSON.parse(process.env.npm_config_argv).remain;
    if (argv[0]) {
        platform = argv[0];
    }
    if (argv[1]) {
        os = argv[1];
    }
}

if (platform !== 'cordova' && platform !== 'browser') {
    console.log(`Invalid platform: ${platform}`);
    console.log(``);
    console.log(`Usage: npm run build [cordova|browser]`);
    process.exit();
}

var targetFolder = 'www';
if (platform === 'cordova') {
    targetFolder += '-cordova';
    if (os) {
        targetFolder += `-${os}`;
    }
}

var folders = _.mapValues({
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
            var actualFolder = FS.readlinkSync(folders.output);
            console.log(`Actual output folder: ${actualFolder}`);
        }
    } catch (err) {
    }
}

var pkg = readJSON('./package.json');

var env = {
    PLATFORM: platform,
    VERSION: pkg.version,
    NODE_ENV: (event === 'build') ? 'production' : 'development',
};
var constants = {};
_.each(env, (value, name) => {
    constants[`process.env.${name}`] = JSON.stringify(String(value));
});

// get list of external libraries
var libraries = parseLibraryList(`${folders.context}/libraries.mjs`);

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
        extensions: [ '.js', '.jsx', '.mjs' ],
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
                exclude: /node_modules/,
                type: 'javascript/auto',
                query: {
                    presets: [
                        [ '@babel/env', { modules: false } ],
                        [ '@babel/react' ],
                    ].map(resolvePreset),
                    plugins: [
                        '@babel/proposal-class-properties',
                        '@babel/proposal-export-default-from',
                        '@babel/proposal-export-namespace-from',
                        '@babel/proposal-json-strings',
                        '@babel/proposal-nullish-coalescing-operator',
                        '@babel/proposal-optional-chaining',
                        '@babel/proposal-throw-expressions',
                        '@babel/syntax-dynamic-import',
                        '@babel/syntax-import-meta',
                        '@babel/transform-regenerator',
                        '@babel/transform-runtime',
                        'syntax-async-functions',
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
            template: `${folders.assets}/${platform}.html`,
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
            reportFilename: `../report.html`,
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
        historyApiFallback: {
            index: '/'
        },
        publicPath: '/'
    }
};

function readJSON(path) {
    var text = FS.readFileSync(path);
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
        return `${__dirname}/${path}`;
    }
}

function parseLibraryList(path) {
    var code = FS.readFileSync(path, { encoding: 'utf8' });
    var libraries = {};
    var re1 = /'([^']+)':.*?{([^}]*)}/g, m1;
    while (m1 = re1.exec(code)) {
        var name = m1[1];
        var re2 = /import\('(.*)'\)/g, m2;
        var modules = [];
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
    var path = _.reduce(folders.modules, (path, folder) => {
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
