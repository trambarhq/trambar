const baseURL = 'https://trambar.io';

/**
 * Form a universal link
 *
 * @param  {String} address
 * @param  {String} url
 *
 * @return {String}
 */
function form(address, url) {
    let hostPath = address.replace('://', '/');
    return baseURL + '/' + hostPath + url;
}

/**
 * Parse a universal link
 *
 * @param  {String} link
 *
 * @return {Object|null}
 */
function parse(link) {
    let regExp = new RegExp('^' + baseURL + '/(https?)/(.*?)/(.*)');
    let m = regExp.exec(link);
    if (!m) {
        return;
    }
    let address = m[1] + '://' + m[2];
    let url = '/' + m[3];
    return { address, url };
}

export {
    parse,
    form,
};
