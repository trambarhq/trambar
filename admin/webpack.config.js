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
if (process.env.npm_lifecycle_event) {
    event = process.env.npm_lifecycle_event;
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
    if (FS.lstatSync(folders.output).isSymbolicLink()) {
        var actualFolder = FS.readlinkSync(folders.output);
        console.log(`Actual output folder: ${actualFolder}`);
    }
}

var pkg = readJSON('./package.json');

var env = {
    PLATFORM: 'browser',
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
                        'env',
                        'react',
                        'stage-0',
                    ],
                    plugins: [
                        'syntax-async-functions',
                        'syntax-class-properties',
                        'transform-regenerator',
                        'transform-runtime',
                    ],
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
    devtool: (event === 'build') ? 'source-map' : 'inline-source-map',
    devServer: {
        inline: true,
        historyApiFallback: {
            index: '/admin/'
        },
        publicPath: '/admin'
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
