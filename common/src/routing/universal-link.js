import _ from 'lodash';

const baseURL = 'https://trambar.io';

function form(address, relativeURL) {
    let hostPath = '/' + _.replace(address, '://', '/');
    let url = baseURL + hostPath + relativeURL;
    return url;
}

const regExp = new RegExp('^' + baseURL + '/(https?)/(.*)');

/**
 * Parse a universal link
 *
 * @param  {String} url
 *
 * @return {String|undefined}
 */
function parse(url) {
    let m = regExp.exec(url);
    if (!m) {
        return;
    }
    return m[1] + '://' + m[2];
}

export {
    parse,
    form,
};
