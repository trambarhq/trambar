var Path = require('path');
var Webpack = require('webpack');
var DefinePlugin = Webpack.DefinePlugin;

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
            devtool: 'inline-source-map',
            module: {
                loaders: [
                    {
                        test: /\.jsx?$/,
                        loader: 'babel-loader',
                        exclude: Path.resolve('./node_modules'),
                        query: {
                            presets: [ 'env', 'stage-0', 'react' ],
                        },
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
            resolve: {
                extensions: [ '.js', '.jsx' ],
                modules: [ 'src', 'node_modules' ].map((folder) => {
                    return Path.resolve(`./${folder}`);
                })
            },
            plugins: [
                new DefinePlugin({
                    'process.env.NODE_ENV': '"production"',
                    'process.env.PLATFORM': '"browser"',
                }),
            ],
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
