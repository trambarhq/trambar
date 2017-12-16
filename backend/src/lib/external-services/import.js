var _ = require('lodash');

module.exports = {
    join,
    attach,
    multilingual,
};

/**
 * Attach a link to an external object to the object
 *
 * @param  {ExternalData} object
 * @param  {Object} link
 *
 * @return {Object}
 */
function join(object, link) {
    var links = object.external;
    if (!links) {
        links = object.external = [];
    }
    // if the object has a link attached already, return that
    var existing = _.find(links, link);
    if (existing) {
        return existing;
    }
    link = _.clone(link);
    links.push(link);
    return link;
}

/**
 * Add or replace a resource
 *
 * @param  {ExternalData} object
 * @param  {String} type
 * @param  {Object} resource
 */
function attach(object, type, resource) {
    // attach profile image
    if (resource) {
        var res = _.extend({ type }, resource);
        var resources = getResources(object);
        var index = _.findIndex(resources, { type });
        if (index !== -1) {
            resources[index] = res;
        } else {
            resources.push(res);
        }
    }
}

function getResources(object) {
    var resources = _.get(object, 'details.resources');
    if (!resources) {
        resources = [];
        _.set(object, 'details.resources', resources);
    }
    return resources;
}

/**
 * Return a multilingual text object from a text string, assuming its language
 * matches that of the system locale
 *
 * @param  {String} langText
 *
 * @return {Object}
 */
function multilingual(langText) {
    var text = {};
    text[lang] = langText;
    return text;
}

var lang = (process.env.LANG || 'en-US').substr(0, 2);
