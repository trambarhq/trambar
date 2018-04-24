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

var event = 'build';
if (process.env.npm_lifecycle_event) {
    event = process.env.npm_lifecycle_event;
}

var folders = _.mapValues({
    src: 'src',
    www: 'www',
    assets: 'assets',
    includes: [ 'src', '../common/src', '../common/node_modules', 'node_modules', 'assets' ],
    loaders: [ 'node_modules', '../common/node_modules' ],
}, resolve);
if (event !== 'start') {
    console.log(`Output folder: ${folders.www}`);
    if (FS.lstatSync(folders.www).isSymbolicLink()) {
        var actualFolder = FS.readlinkSync(folders.www);
        console.log(`Actual output folder: ${actualFolder}`);
    }
}

var env = {
    PLATFORM: 'browser',
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
    entry: './bootstrap',
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
                        'babel-preset-es2015',
                        'babel-preset-react',
                    ].map(require.resolve),
                    plugins: [
                        'babel-plugin-syntax-dynamic-import'
                    ].map(require.resolve),
                }
            },
            {
                test: /\.css$/,
                loader: 'css-loader'
            },
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader'
                    },
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
                    }
                ]
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

function resolve(path) {
    if (_.isArray(path)) {
        return _.map(path, resolve);
    } else {
        return Path.resolve(`${__dirname}/${path}`);
    }
}
