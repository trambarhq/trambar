export const CORSRewriter = {
  from: (urlParts, context) => {
    let regExp = new RegExp('^/(https?)/([^/]*)');
    let m = regExp.exec(urlParts.path);
    let cors = false;
    let host, protocol;
    if (m) {
      protocol = m[1] + ':';
      host = m[2];
      urlParts.path = urlParts.path.substr(m[0].length);
      if (window.location.host !== host || window.location.protocol !== protocol) {
        cors = true;
      }
    } else {
      if (process.env.PLATFORM !== 'cordova') {
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
    }
    context.cors = cors;
    if (protocol && host) {
      context.address = `${protocol}//${host}`;
    }
  },
  to: (urlParts, context) => {
    if (context.cors) {
      let address = context.address;
      if (address) {
        let colonIndex = address.indexOf('://');
        let prefix = address.substr(0, colonIndex);
        let host = address.substr(colonIndex + 3);
        urlParts.path = `/${prefix}/${host}` + urlParts.path;
      }
    }
  }
};
