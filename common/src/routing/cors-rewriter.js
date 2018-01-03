module.exports = {
    extract,
    insert,
};

/**
 * Extract server name and protocol from URL path
 *
 * @param  {Object} urlParts
 * @param  {Object} params
 */
function extract(urlParts, params) {
    // e.g. /https/live.trambar.io/project/news/
    var regExp = new RegExp('^/(https?)/([^/]*)');
    var m = regExp.exec(urlParts.path);
    var host, protocol;
    if (m) {
        protocol = m[1] + ':';
        host = m[2];
        urlParts.path = urlParts.path.substr(m[0].length);
        params.cors = true;
    } else {
        if (process.env.PLATFORM === 'browser') {
            host = window.location.host;
            protocol = window.location.protocol;
            if (process.env.NODE_ENV !== 'production') {
                if (/^localhost:\d+$/.test(host)) {
                    // assume page is hosted by webpack-dev-server and that
                    // the remote server is actually at port 80
                    host = 'localhost';
                    protocol = 'http:';
                }
            }
        }
        params.cors = false;
    }
    params.address = `${protocol}//${host}`;
}

/**
 * Add server protocl and name to URL if CORS is active
 *
 * @param  {Object} urlParts
 * @param  {Object} params
 */
function insert(urlParts, params) {
    if (params.cors) {
        var address = params.address;
        if (address) {
            var colonIndex = address.indexOf('://');
            var prefix = address.substr(0, colonIndex);
            var host = address.substr(colonIndex + 3);
            urlParts.path = `/${prefix}/${host}` + urlParts.path;
        }
    }
}
