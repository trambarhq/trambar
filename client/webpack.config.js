var _ = require('lodash');
var Path = require('path');
var Webpack = require('webpack');

// plugins
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CommonsChunkPlugin = Webpack.optimize.CommonsChunkPlugin;
var DefinePlugin = Webpack.DefinePlugin;
var SourceMapDevToolPlugin = Webpack.SourceMapDevToolPlugin;
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');

var event = process.env.npm_lifecycle_event;
var configArgv = JSON.parse(process.env.npm_config_argv);
var platform = configArgv.remain[0] || 'browser';

if (platform !== 'cordova' && platform !== 'browser') {
    console.log(`Invalid platform: ${platform}`);
    console.log(``);
    console.log(`Usage: npm run build [cordova|browser]`);
    process.exit();
}

var folders = _.mapValues({
    src: 'src',
    www: (platform === 'cordova') ? 'www-cordova' : 'www',
    assets: 'assets',
    includes: [ 'src', '../common/src', 'node_modules', 'assets' ]
}, resolve);
console.log(`Platform: ${platform}`);
console.log(`Output folder: ${folders.www}`);

var env = {
    PLATFORM: platform,
    NODE_ENV: (event === 'build') ? 'production' : 'development',
};
var constants = {};
_.each(env, (value, name) => {
    constants[`process.env.${name}`] = JSON.stringify(String(value));
});

module.exports = {
    context: folders.src,
    entry: './main',
    output: {
        path: folders.www,
        filename: '[name].js',
    },
    resolve: {
        extensions: [ '.js', '.jsx' ],
        modules: folders.includes
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                query: {
                    presets: [
                        'babel-preset-es2015',
                        'babel-preset-react',
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
                        loader: 'sass-loader',
                    }
                ]
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'url-loader',
                query: {
                    limit: 100000,
                    mimetype: 'application/font-woff',
                }
            },
            {
                test: /fonts.*\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'file-loader',
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
        ]
    },
    plugins: [
        new DefinePlugin(constants),
        new HtmlWebpackPlugin({
            template: `${folders.assets}/${platform}.html`,
            filename: `${folders.www}/index.html`,
        }),
        new CommonsChunkPlugin({
            name: 'vendor',
            minChunks: (module) => {
                return module.context && module.context.indexOf('node_modules') !== -1;
            },
        }),
        new SourceMapDevToolPlugin({
            filename: "[file].map",
            exclude: ["vendor.js"]
        }),
    ],
    devServer: {
        inline: true,
        historyApiFallback: {
            rewrites: [
                {
                    from: /.*/,
                    to: '/index.html'
                }
            ]
        }
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
