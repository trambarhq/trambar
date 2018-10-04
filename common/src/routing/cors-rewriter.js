const CORSRewriter = {
    from: (urlParts, context) => {
        var regExp = new RegExp('^/(https?)/([^/]*)');
        var m = regExp.exec(urlParts.path);
        var host, protocol, cors;
        if (m) {
            protocol = m[1] + ':';
            host = m[2];
            urlParts.path = urlParts.path.substr(m[0].length);
            cors = true;
        } else {
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
            cors = false;
        }
        context.cors = cors;
        context.address = `${protocol}//${host}`;
    },
    to: (urlParts, context) => {
        if (context.cors) {
            var address = context.address;
            if (address) {
                var colonIndex = address.indexOf('://');
                var prefix = address.substr(0, colonIndex);
                var host = address.substr(colonIndex + 3);
                urlParts.path = `/${prefix}/${host}` + urlParts.path;
            }
        }
    }
};

export {
    CORSRewriter as default,
};
