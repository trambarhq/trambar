import _ from 'lodash';

const baseURL = 'https://trambar.io';

function form(address, path, query, hash) {
    let hostPath = '/' + _.replace(address, '://', '/');
    let url = baseURL + hostPath + path;
    if (!_.isEmpty(query)) {
        let pairs = _.filter(_.map(query, (value, name) => {
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

const regExp = new RegExp('^' + baseURL + '((/https?/[^/]*)([^?]*)([^#]*)?(#(.*))?)');

function parse(universalURL) {
    let m = regExp.exec(universalURL);
    if (!m) {
        return null;
    }
    let url = m[1];
    let hostPath = m[2];
    let address = _.replace(hostPath.substr(1), '/', '://');
    let path = m[3];
    let queryString = m[4];
    let query;
    if (queryString) {
        query = {};
        let pairs = _.split(queryString.substr(1), '&');
        _.each(pairs, (pair) => {
            let parts = _.split(pair, '=');
            let name = parts[0];
            let value = decodeURIComponent(parts[1]);
            query[name] = value;
        });
    }
    let hash = m[6];
    return { address, path, query, hash, url };
}

export {
    parse,
    form,
};
