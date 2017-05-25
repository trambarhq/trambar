exports.parse = function(url) {
    if (/^trambar:/.test(url)) {
        return parseTrambarUrl(url);
    } else {
        return parseHttpUrl(url);
    }
}

function parseTrambarUrl(url) {
    var parts = {
        server: '',
        schema: '',
    };
    var m = /^trambar:\/\/([^/]*)\/([^/]*)/.exec(url);
    if (m) {
        parts.server = m[1];
        parts.schema = m[2];
    }
    return parts;
}

function parseHttpUrl(url) {

}
