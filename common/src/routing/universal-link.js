const baseURL = 'https://trambar.io';

function createActivationURL(address, schema, activationCode) {
    let hostPath = address.replace('://', '/');
    return `${baseURL}/${hostPath}/?ac=${activationCode}&p=${schema}`;
}

function parseActivationURL(url) {
    let regExp = new RegExp(`^${baseURL}/([^/]+)/([^/]+)/\\?ac=([^&]+)&p=([^&]+)`);
    let m = regExp.exec(url);
    if (!m) {
        return null;
    }
    let protocol = m[1];
    let host = m[2];
    let schema = m[4];
    let activationCode = m[3];
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
