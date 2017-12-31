var _ = require('lodash');

module.exports = {
    parse,
    form,
};

var baseURL = 'https://trambar.io';

function form(address, path, query, hash) {
    var hostPath = '/' + _.replace(address, '://', '/');
    var url = baseURL + hostPath + path;
    if (!_.isEmpty(query)) {
        var pairs = _.filter(_.map(query, (value, name) => {
            if (value != undefined) {
                return name + '=' + encodeURIComponent(value);
            }
        }));
        url += '?' + pairs.join('&');
    }
    if (hash) {
        url += '#' + hash;
    }
    return url;
}

var regExp = new RegExp('^' + baseURL + '((/https?/[^/]*)([^?]*)([^#]*)?(#(.*))?)');

function parse(url) {
    var m = regExp.exec(url);
    if (!m) {
        return null;
    }
    var url = m[1];
    var hostPath = m[2];
    var address = _.replace(hostPath.substr(1), '/', '://');
    var path = m[3];
    var queryString = m[4];
    var query;
    if (queryString) {
        query = {};
        var pairs = _.split(queryString.substr(1), '&');
        _.each(pairs, (pair) => {
            var parts = _.split(pair, '=');
            var name = parts[0];
            var value = decodeURIComponent(parts[1]);
            query[name] = value;
        });
    }
    var hash = m[6];
    return { address, path, query, hash, url };
}
