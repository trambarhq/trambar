var _ = require('lodash');

module.exports = {
    createLink,
    extendLink,
    addLink,
    inheritLink,
    attachLink,
    findLink,
    findLinkByServerType,
    findLinkByRelations,
    findLinkByRelative,
    removeLink,
    countLinks,
    importProperty,
    importResource,
    exportProperty,
    hasPreviousImport,
    hasPreviousExport,
    findCommonServer,
};

/**
 * Create a link to an external resource that exists on specified server
 *
 * @param  {Server} server
 * @param  {Object|undefined} props
 *
 * @return {Object}
 */
function createLink(server, props) {
    return _.assign({
        type: server.type,
        server_id: server.id
    }, props);
}

/**
 * Create a link based on object that's already linked to specified server
 *
 * @param  {Server} server
 * @param  {Object} parent
 * @param  {Object|undefined} props
 *
 * @return {Object}
 */
function extendLink(server, parent, props) {
    var parentLink = findLink(parent, server);
    if (!parentLink) {
        throw new Error('Parent object is not linked to server');
    }
    // omit fields whose names begin with underscore
    parentLink = _.pickBy(parentLink, (value, name) => {
        return name.charAt(0) !== '_';
    });
    return _.assign(parentLink, props);
}

/**
 * Add a link pointing to a server to an object
 *
 * @param {ExternalObject} object
 * @param {Server} server
 * @param {Object} props
 *
 * @return {Object}
 */
function addLink(object, server, props) {
    var link = createLink(server, props);
    return attachLink(object, link);
}

/**
 * Add a link based on another object already linked to specified server
 *
 * @param {ExternalObject} object
 * @param {Server} server
 * @param {Object|undefined} props
 *
 * @return {Object}
 */
function inheritLink(object, server, parent, props) {
    var link = extendLink(server, parent, props);
    return attachLink(object, link);
}

/**
 * Attach a link to an object
 *
 * @param  {ExternalObject} object
 * @param  {Object} link
 *
 * @return {Object}
 */
function attachLink(object, link) {
    var existingLink = _.find(object.external, { server_id: link.server_id });
    if (existingLink) {
        if (_.isMatch(existingLink, link)) {
            return existingLink;
        } else {
            throw new Error('Object is linked to server already');
        }
    }
    if (!object.external) {
        object.external = [];
    }
    object.external.push(link);
    return link;
}

/**
 * Find a link to specified server
 *
 * @param  {ExternalObject} object
 * @param  {Server} server
 * @param  {Object|undefined} props
 *
 * @return {Object|null}
 */
function findLink(object, server, props) {
    var link = _.find(object.external, { server_id: server.id });
    if (link) {
        if (!props || _.isMatch(link, props)) {
            return link;
        }
    }
    return null;
}

/**
 * Find a link by server type
 *
 * @param  {ExternalObject} object
 * @param  {String} serverType
 * @param  {Object|undefined} props
 *
 * @return {Object|null}
 */
function findLinkByServerType(object, serverType, props) {
    var link = _.find(object.external, { type: serverType });
    if (link) {
        if (!props || _.isMatch(link, props)) {
            return link;
        }
    }
    return null;
}

/**
 * Find a link by relations it has
 *
 * @param  {ExternalObject} object
 * @param  {String} ...relations
 *
 * @return {Object|null}
 */
function findLinkByRelations(object, ...relations) {
    var link = _.find(object.external, (link) => {
        if (_.every(_.pick(link, relations))) {
            return true;
        }
    });
    return link || null;
}

/**
 * Find a link that also exists in another object
 *
 * @param  {ExternalObject} object
 * @param  {String} ...relations
 *
 * @return {Object|null}
 */
function findLinkByRelative(object, relative, ...relations) {
    var link = _.find(object.external, (link1) => {
        return _.find(relative.external, (link2) => {
            if (link1.type === link2.type && link1.server_id === link2.server_id) {
                if (_.isEmpty(relations)) {
                    return true;
                }
                if (_.isEqual(_.pick(link1, relations), _.pick(link2, relations))) {
                    return true;
                }
            }
        });
    });
    return link || null;
}

/**
 * Remove any link to a specified server
 *
 * @param  {ExternalObject} object
 * @param  {Server} server
 * @param  {Object|undefined} props
 */
function removeLink(object, server, props) {
    _.remove(object.external, (link) => {
        if (link.server_id === server.id) {
            if (!props || _.isMatch(link, props)) {
                return true;
            }
        }
    });
}

/**
 * Return the number of links attached to object
 *
 * @param  {ExternalObject} object
 *
 * @return {Number}
 */
function countLinks(object) {
    return _.size(object.external);
}

/**
 * Import a value into an object
 *
 * @param  {ExternalObject} object
 * @param  {Server} server
 * @param  {String} path
 * @param  {Object} prop
 */
function importProperty(object, server, path, prop) {
    if (prop.ignore) {
        return;
    }
    var currentValue = _.get(object, path);
    if (prop.overwrite === 'always') {
        if (prop.value !== undefined) {
            _.set(object, path, prop.value);
        } else {
            _.unset(object, path);
        }
    } else if (prop.overwrite === 'never') {
        if (currentValue === undefined) {
            if (prop.value !== undefined) {
                _.set(object, path, prop.value);
            }
        }
    } else if (prop.overwrite === 'match-previous') {
        var previous = getPreviousImport(object, server);
        var previousValue = _.get(previous, path);
        if (_.isEqual(currentValue, previousValue)) {
            if (prop.value !== undefined) {
                _.set(object, path, prop.value);
                _.set(previous, path, prop.value);
            } else {
                _.unset(object, path);
                _.unset(previous, path);
            }
        }
    } else {
        throw new Error('Unknown option: ' + prop.overwrite);
    }
}

/**
 * Import a resource into details.resources
 *
 * @param  {ExternalObject} object
 * @param  {Server} server
 * @param  {Object} prop
 */
function importResource(object, server, prop) {
    if (prop.ignore) {
        return;
    }
    var path = 'details.resources';
    var resources = _.get(object, path, []);
    var index = _.findIndex(resources, { type: prop.type });
    var currentValue = resources[index];
    if (prop.replace === 'always') {
        if (currentValue === undefined) {
            if (prop.value) {
                resources.push(prop.value);
            }
        } else {
            if (prop.value) {
                resources[index] = prop.value;
            } else {
                resources.splice(index, 1);
            }
        }
    } else if (prop.replace === 'never') {
        if (currentValue === undefined) {
            if (prop.value) {
                resources.push(prop.value);
            }
        }
    } else if (prop.replace === 'match-previous') {
        var previous = getPreviousImport(object, server);
        var previousResources = _.get(previous, path, []);
        var previousIndex = _.findIndex(previousResources, { type: prop.type });
        var previousValue = previousResources[previousIndex];
        if (_.isEqual(currentValue, previousValue)) {
            if (currentValue === undefined) {
                if (prop.value) {
                    resources.push(prop.value);
                    previousResources.push(prop.value);
                }
            } else {
                if (prop.value) {
                    resources[index] = prop.value;
                    previousResources[previousIndex] = prop.value;
                } else {
                    resources.splice(index, 1);
                    previousResources.splice(previousIndex, 1);
                }
            }
        }
        if (_.isEmpty(previousResources)) {
            _.unset(previous, path);
        } else {
            _.set(previous, path, previousResources);
        }
    } else {
        throw new Error('Unknown option: ' + prop.replace);
    }
    if (_.isEmpty(resources)) {
        _.unset(object, path);
    } else {
        _.set(object, path, resources);
    }
}

/**
 * Export a value to another object
 *
 * @param  {ExternalObject} object
 * @param  {Server} server
 * @param  {String} path
 * @param  {Object} dest
 * @param  {Object} prop
 */
function exportProperty(object, server, path, dest, prop) {
    if (prop.ignore) {
        return;
    }
    var currentValue = _.get(dest, path);
    if (prop.overwrite === 'always') {
        _.set(dest, path, prop.value);
    } else if (prop.overwrite === 'never') {
        if (currentValue === undefined) {
            _.set(dest, path, prop.value);
        }
    } else if (prop.overwrite === 'match-previous') {
        var previous = getPreviousExport(object, server);
        var previousValue = _.get(previous, path);
        if (_.isEqual(currentValue, previousValue)) {
            _.set(dest, path, prop.value);
            _.set(previous, path, prop.value);
        } else {
            console.log('Expected: ', previousValue);
            console.log('Actual: ', currentValue);
        }
    } else {
        throw new Error('Unknown option: ' + prop.overwrite);
    }
}

/**
 * Get previously imported values stored in link object
 *
 * @param  {ExternalObject} object
 * @param  {Server} server
 *
 * @return {Object}
 */
function getPreviousImport(object, server) {
    var link = findLink(object, server);
    if (!link._import) {
        link._import = {};
    }
    return link._import;
}

/**
 * Get previously exported values stored in link object
 *
 * @param  {ExternalObject} object
 * @param  {Server} server
 *
 * @return {Object}
 */
function getPreviousExport(object, server) {
    var link = findLink(object, server);
    if (!link._export) {
        link._export = {};
    }
    return link._export;
}

/**
 * Return true if the object has a link containing previously imported values
 *
 * @param  {ExternalObject}  object
 * @param  {Server}  server
 *
 * @return {Boolean}
 */
function hasPreviousImport(object, server) {
    return !!getPreviousImport(object, server);
}

/**
 * Return true if the object has a link containing previously exported values
 *
 * @param  {ExternalObject}  object
 * @param  {Server}  server
 *
 * @return {Boolean}
 */
function hasPreviousExport(object, server) {
    return !!getPreviousExport(object, server);
}

/**
 * Return id and type of server common to specified objects
 *
 * @param  {ExternalObject} ...objects
 *
 * @return {Object|null}
 */
function findCommonServer(...objects) {
    var first = _.first(objects);
    var rest = _.slice(objects, 1);
    var link = _.find(first.external, (link1) => {
        var props = _.pick(link1, 'server_id', 'type');
        return _.every(rest, (other) => {
            return _.some(other.external, props);
        });
    });
    if (!link) {
        return null;
    }
    return {
        id: link.server_id,
        type: link.type,
    };
}
