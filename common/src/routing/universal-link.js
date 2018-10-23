const baseURL = 'https://trambar.io';

/**
 * Form a universal link
 *
 * @param  {String} url
 *
 * @return {String}
 */
function form(url) {
    return baseURL + url;
}

/**
 * Parse a universal link
 *
 * @param  {String} link
 *
 * @return {String|undefined}
 */
function parse(link) {
    let regExp = new RegExp('^' + baseURL + '(/https?/.*?/.*)');
    let m = regExp.exec(link);
    if (m) {
        return m[1];
    }
}

export {
    parse,
    form,
};
