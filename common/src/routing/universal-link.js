const baseURL = 'https://trambar.io';

function createActivationURL(address, schema, activationCode) {
    let hostPath = address.replace('://', '/');
    return `${baseURL}/${hostPath}/?p=${schema}&ac=${activationCode}`;
}

function parseActivationURL(url) {
    let regExp = new RegExp(`^${baseURL}/([^/]+)/([^/]+)/\\?p=([^&]+)&ac=([^&]+)`);
    let m = regExp.exec(url);
    if (!m) {
        return null;
    }
    let protocol = m[1];
    let host = m[2];
    let schema = m[3];
    let activationCode = m[4];
    return {
        address: `${protocol}://${host}`,
        schema,
        activationCode,
    };
}

export {
    createActivationURL,
    parseActivationURL,
};
