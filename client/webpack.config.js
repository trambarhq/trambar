var _ = require('lodash');
var Path = require('path');

// plugins
var HtmlWebpackPlugin = require('html-webpack-plugin');

var folders = _.mapValues({
    src: 'src',
    www: 'www',
    assets: 'assets',
    includes: [ 'src', '../common/src', 'node_modules' ]
}, resolve);

module.exports = {
    context: folders.src,
    entry: './main',
    output: {
        path: folders.www,
        filename: 'app.js',
    },
    resolve: {
        extensions: [ '.js', '.jsx' ],
        modules: folders.includes
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
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: `${folders.assets}/index.html`,
            filename: `${folders.www}/index.html`,
        })
    ],
};

function resolve(path) {
    if (_.isArray(path)) {
        return _.map(path, resolve);
    } else {
        return Path.resolve(`${__dirname}/${path}`);
    }
}
