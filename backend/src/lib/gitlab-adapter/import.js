var _ = require('lodash');

exports.join = join;
exports.reacquire = reacquire;
exports.set = set;
exports.attach = attach;
exports.multilingual = multilingual;

exports.Link = { find, create, pick, merge };

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
 * Return the previously imported values stored in the link object, adding the
 * link where there isn't one
 *
 * @param  {ExternalData} object
 * @param  {Object} link
 * @param  {String} objectName
 *
 * @return {Object}
 */
function reacquire(object, link, objectName) {
    var attachedLink = join(object, link);
    var object = link[objectName];
    if (!object) {
        throw new Error(`Link does not contain ${objectName}`);
    }
    var imported = object.imported;
    if (!imported) {
        imported = object.imported = {};
    }
    return imported;
}

/**
 * Set object property if its current value is the same as previously imported
 * (if not, then it was changed)
 *
 * @param  {ExternalData} object
 * @param  {Object} previouslyImported
 * @param  {String} name
 * @param  {*} value
 *
 * @return {[type]}
 */
function set(object, previouslyImported, path, value) {
    var currentValue = _.get(object, path);
    var importedValue = _.get(previouslyImported, path);
    if (_.isEqual(currentValue, importedValue)) {
        _.set(object, path, value);
        _.set(previouslyImported, path, value);
    }
}

/**
 * Add or replace a resource if was previously imported
 *
 * @param  {ExternalData} object
 * @param  {Object} previouslyImported
 * @param  {String} type
 * @param  {Object} resource
 */
function attach(object, previouslyImported, type, resource) {
    // attach profile image
    if (resource) {
        var res = _.extend({ type }, resource);
        var currentResources = getResources(object);
        var importedResources = getResources(previouslyImported);
        var currentIndex = _.findIndex(currentResources, { type });
        if (currentIndex !== -1) {
            // replace it only if was imported previously
            var current = currentResources[currentIndex];
            var importedIndex = _.findIndex(importedResources, current);
            if (importedIndex !== -1) {
                currentResources[currentIndex] = res;
                importedResources[importedIndex] = res;
            }
        } else {
            currentResources.push(res);
            importedResources.push(res);
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

/**
 * Find a link by server
 *
 * @param  {ExternalData} object
 * @param  {Server|null} server
 *
 * @return {Object|undefined}
 */
function find(object, server) {
    if (server) {
        return _.find(object.external, {
            type: 'gitlab',
            server_id: server.id
        });
    } else {
        return _.find(object.external, {
            type: 'gitlab',
        });
    }
}

/**
 * Create a link to a server and an object there
 *
 * @param  {Server} server
 * @param  {Object} props
 *
 * @return {Object}
 */
function create(server, props) {
    return _.merge({}, {
        type: 'gitlab',
        server_id: server.id
    }, props);
}

/**
 * Pick a particular link from a record that links to multiple external objects
 *
 * @param  {Object} link
 * @param  {String} objectName
 *
 * @return {Object|null}
 */
function pick(link, objectName) {
    if (link && link[objectName]) {
        var partial = {
            type: link.type,
            server_id: link.server_id,
        };
        partial[objectName] = link[objectName];
        return partial;
    }
}

/**
 * Create a link by merging multiple links
 *
 * @param  {Object} link
 * @param  {Object...} parentLinks
 *
 * @return {Object}
 */
function merge(link, ...parentLinks) {
    link = _.clone(link);
    if (!link.type) {
        throw new Error('Merging a link with missing type');
    }
    if (!link.server_id) {
        throw new Error('Merging a link with missing server_id');
    }
    _.each(parentLinks, (parentLink) => {
        if (parentLink.type !== link.type) {
            throw new Error('Cannot merge links of different types');
        }
        if (parentLink.server_id !== link.server_id) {
            throw new Error('Cannot merge links to different servers');
        }
        _.forIn(parentLink, (value, name) => {
            if (value.id) {
                link[name] = { id: value.id };
            } else if (value.ids) {
                link[name] = { ids: value.ids };
            }
        });
    });
    return link;
}
