var _ = require('lodash');
var Path = require('path');
var FS = require('fs');
var Webpack = require('webpack');

// plugins
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CommonsChunkPlugin = Webpack.optimize.CommonsChunkPlugin;
var NamedChunksPlugin = Webpack.NamedChunksPlugin;
var NamedModulesPlugin = Webpack.NamedModulesPlugin;
var ContextReplacementPlugin = Webpack.ContextReplacementPlugin;
var DefinePlugin = Webpack.DefinePlugin;
var SourceMapDevToolPlugin = Webpack.SourceMapDevToolPlugin;
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
var ExtractTextPlugin = require("extract-text-webpack-plugin");

var event = 'build';
if (process.env.npm_lifecycle_event) {
    event = process.env.npm_lifecycle_event;
}

var folders = _.mapValues({
    src: 'src',
    www: 'www',
    assets: 'assets',
    includes: [ 'src', 'assets', '../common/src', '../common/assets', '../common/node_modules', 'node_modules' ],
    loaders: [ 'node_modules', '../common/node_modules' ],
}, resolve);
if (event !== 'start') {
    console.log(`Output folder: ${folders.www}`);
    if (FS.lstatSync(folders.www).isSymbolicLink()) {
        var actualFolder = FS.readlinkSync(folders.www);
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
var code = FS.readFileSync(`${folders.src}/libraries.js`, { encoding: 'utf8'});
var libraries = [];
var re = /webpackChunkName:\s*"(.+)"/ig, m;
while (m = re.exec(code)) {
    libraries.push(m[1]);
}

module.exports = {
    context: folders.src,
    entry: './main',
    output: {
        path: folders.www,
        filename: '[name].js?[hash]',
        chunkFilename: '[name].js?[chunkhash]',
    },
    resolve: {
        extensions: [ '.js', '.jsx' ],
        modules: folders.includes,
    },
    resolveLoader: {
        modules: folders.loaders,
    },
    module: {
        rules: [
            {
                test: /.jsx?$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                query: {
                    presets: [
                        'env',
                        'stage-0',
                        'react',
                    ],
                    plugins: [
                    ],
                }
            },
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: 'css-loader',
                }),
            },
            {
                test: /\.scss$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: [
                        'css-loader',
                        {
                            loader: 'postcss-loader',
                            options: {
                                config: {
                                    path: resolve('postcss.config.js'),
                                },
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                includePaths: [ resolve('../common/node_modules') ]
                            }
                        }
                    ],
                }),
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
            filename: `${folders.www}/index.html`,
            version: env.VERSION,
        }),
        new ExtractTextPlugin({
            filename: 'styles.css?[hash]',
            allChunks: true,
        }),
        // pull library code out of app chunk and into their own files
        ... _.map(libraries, (lib) => {
            return new CommonsChunkPlugin({
                async: lib,
                chunks: [ 'app', lib ],
            });
        }),
        new NamedChunksPlugin,
        new NamedModulesPlugin,
        new SourceMapDevToolPlugin({
            filename: '[file].map',
        }),
        new ContextReplacementPlugin(/moment[\/\\]locale$/, /zz/),
        new BundleAnalyzerPlugin({
            analyzerMode: (event === 'build') ? 'static' : 'disabled',
            reportFilename: `../report_admin.html`,
        }),
    ],
    devServer: {
        inline: true,
        historyApiFallback: {
            index: '/admin/'
        },
        publicPath: '/admin'
    }
};

if (event === 'build') {
    // use Uglify to remove dead-code
    console.log('Optimizing JS code');
    module.exports.plugins.unshift(new UglifyJSPlugin());
}

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

function resolveBabel(type, module) {
    if (module instanceof Array) {
        module[0] = resolve(type, module[0]);
        return module;
    } else {
        if (!/^[\w\-]+$/.test(module)) {
            return module;
        }
        return Path.resolve(`../common/node_modules/babel-${type}-${module}`);
    }
}

module.exports.module.rules.forEach((rule) => {
    if (rule.loader === 'babel-loader' && rule.query) {
        if (rule.query.presets) {
            rule.query.presets = rule.query.presets.map((preset) => {
                return resolveBabel('preset', preset);
            })
        }
        if (rule.query.plugins) {
            rule.query.plugins = rule.query.plugins.map((plugin) => {
                return resolveBabel('plugin', plugin);
            })
        }
    }
});
