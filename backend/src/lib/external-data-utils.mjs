import get from 'lodash/get.js'
import set from 'lodash/set.js';
import unset from 'lodash/unset.js';
import isEqual from 'lodash/isEqual.js';
import isMatch from 'lodash/isMatch.js';

/**
 * Create a link to an external resource that exists on specified server
 *
 * @param  {Server} server
 * @param  {Object|undefined} props
 *
 * @return {Object}
 */
function createLink(server, props) {
  return {
    type: server.type,
    server_id: server.id,
    ...props,
  };
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
  const parentLink = findLink(parent, server);
  if (!parentLink) {
    throw new Error('Parent object is not linked to server');
  }
  // omit fields whose names begin with underscore
  const inherited = {};
  for (let [ name, value ] of Object.entries(parentLink)) {
    if (name.charAt(0) !== '_') {
      inherited[name] = value;
    }
  }
  return { ...inherited, ...props };
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
  const link = createLink(server, props);
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
  const link = extendLink(server, parent, props);
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
  if (object.external) {
    const index = object.external.findIndex(lnk => lnk.server_id === link.server_id);
    if (index !== -1) {
      object.external[index] = link;
    } else {
      object.external.push(link);
    }
  } else {
    object.external = [ link ];
  }
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
  if (!object.external) {
    return null;
  }
  const link = object.external.find(lnk => lnk.server_id === server.id);
  if (link) {
    if (!props || isMatch(link, props)) {
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
  if (!object.external) {
    return null;
  }
  const link = object.external.find(lnk => lnk.type === serverType);
  if (link) {
    if (!props || isMatch(link, props)) {
      return link;
    }
  }
  return null;
}

/**
 * Find a link by relations it has
 *
 * @param  {ExternalObject} object
 * @param  {Array<String>} ...relations
 *
 * @return {Object|null}
 */
function findLinkByRelations(object, ...relations) {
  if (!object.external) {
    return null;
  }
  const link = object.external.find((link) => {
    for (let relation of relations) {
      if (!link[relation]) {
        return false;
      }
    }
    return true;
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
  if (!object.external || !relative.external) {
    return null;
  }
  const link = object.external.find((link1) => {
    return relative.external.some((link2) => {
      if (link1.server_id === link2.server_id && link1.type === link2.type) {
        for (let relation of relations) {
          if (!isEqual(link1[relation], link2[relation])) {
            return false;
          }
        }
        return true;
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
  if (!object.external) {
    return;
  }
  const index = object.external.findIndex((link) => {
    if (link.server_id === server.id) {
      if (!props || isMatch(link, props)) {
        return true;
      }
    }
  });
  if (index !== -1) {
    object.external.splice(index, 1);
  }
}

/**
 * Return the number of links attached to object
 *
 * @param  {ExternalObject} object
 *
 * @return {Number}
 */
function countLinks(object) {
  return (object.external) ? object.external.length : 0;
}

/**
 * Import a value (from an external source) into an object
 *
 * @param  {ExternalObject} object
 * @param  {Server} server
 * @param  {String} path
 * @param  {Object} prop
 */
function importProperty(object, server, path, prop) {
  const { ignore, overwrite, value } = prop;
  if (ignore) {
    return;
  }
  const currentValue = get(object, path);
  if (overwrite === 'always') {
    if (prop.value !== undefined) {
      set(object, path, value);
    } else {
      unset(object, path);
    }
  } else if (overwrite === 'never') {
    if (currentValue === undefined) {
      if (prop.value !== undefined) {
        set(object, path, value);
      }
    }
  } else if (overwrite.startsWith('match-previous:')) {
    // look up the value from the previous import
    const exchangeKey = overwrite.substr(overwrite.indexOf(':') + 1).trim();
    const previous = getPreviousValues(object, server);
    const previousValue = get(previous, exchangeKey);
    if (isEqual(currentValue, previousValue)) {
      // okay, the current value match what was imported before, meaning
      // it hasn't been modified by a user (probably); so we can overwrite
      // the current value with the new value
      if (value !== undefined) {
        set(object, path, value);
      } else {
        unset(previous, exchangeKey);
      }
    }
    // save the new value into the exchange object, doing so even when import
    // didn't happen; this allows the values to sync up again if the user
    // modifies the one at the external source to match ours
    if (value !== undefined) {
      set(previous, exchangeKey, value);
    } else {
      unset(previous, exchangeKey);
    }
  } else {
    throw new Error('Unknown option: ' + overwrite);
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
  const { ignore, replace, type, value } = prop;
  if (ignore) {
    return;
  }
  const path = 'details.resources';
  const resources = get(object, path, []);
  const index = resources.findIndex(res => res.type === type);
  const currentValue = resources[index];
  if (replace === 'always') {
    if (currentValue === undefined) {
      if (value) {
        resources.push(value);
      }
    } else {
      if (value) {
        resources[index] = value;
      } else {
        resources.splice(index, 1);
      }
    }
  } else if (replace === 'never') {
    if (currentValue === undefined) {
      if (value) {
        resources.push(value);
      }
    }
  } else if (replace === 'match-previous') {
    const exchangeKey = 'resources';
    const previous = getPreviousValues(object, server);
    const previousResources = get(previous, exchangeKey, []);
    const previousIndex = previousResources.findIndex(res => res.type === type);
    const previousValue = previousResources[previousIndex];
    if (isEqual(currentValue, previousValue)) {
      if (currentValue === undefined) {
        if (value) {
          resources.push(value);
          previousResources.push(value);
        }
      } else {
        if (value) {
          resources[index] = value;
          previousResources[previousIndex] = value;
        } else {
          resources.splice(index, 1);
          previousResources.splice(previousIndex, 1);
        }
      }
    }
    if (previousResources.length > 0) {
      set(previous, exchangeKey, previousResources);
    } else {
      unset(previous, exchangeKey);
    }
  } else {
    throw new Error('Unknown option: ' + replace);
  }
  if (resources.length > 0) {
    set(object, path, resources);
  } else {
    unset(object, path);
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
  let currentValue = get(dest, path);
  let overwrite = prop.overwrite;
  let exchangeKey;
  let colonIndex = overwrite.indexOf(':');
  if (colonIndex !== -1) {
    exchangeKey = overwrite.substr(colonIndex + 1);
    overwrite = overwrite.substr(0, colonIndex);
  }
  if (overwrite === 'always') {
    set(dest, path, prop.value);
  } else if (overwrite === 'never') {
    if (currentValue === undefined) {
      set(dest, path, prop.value);
    }
  } else if (overwrite === 'match-previous') {
    let previous = getPreviousValues(object, server);
    let previousValue = get(previous, exchangeKey);
    if (isEqual(currentValue, previousValue)) {
      set(dest, path, prop.value);
      set(previous, exchangeKey, prop.value);
    }
  } else {
    throw new Error('Unknown option: ' + overwrite);
  }
}

/**
 * Get previously exchanged values
 *
 * @param  {ExternalObject} object
 * @param  {Server} server
 *
 * @return {Object}
 */
function getPreviousValues(object, server) {
  let entry;
  if (object.exchange) {
    entry = object.exchange.find(lnk => lnk.server_id === server.id);
  }
  if (!entry) {
    entry = {
      type: server.type,
      server_id: server.id,
      previous: {}
    };
    if (!object.exchange) {
      object.exchange = [];
    }
    object.exchange.push(entry);
  }
  return entry.previous;
}

/**
 * Return id and type of server common to specified objects
 *
 * @param  {ExternalObject} first
 * @param  {ExternalObject} ...rest
 *
 * @return {Object|null}
 */
function findCommonServer(first, ...rest) {
  if (!first.external) {
    return null;
  }
  const link = first.external.find((link1) => {
    // make sure the rest are linked to the same server
    for (let other of rest) {
      if (!other.external) {
        return false;
      }
      const link2 = other.external.find((link2) => {
        return (link2.server_id === link1.server_id) && (link2.type === link1.type);
      });
      if (!link2) {
        return false;
      }
    }
    return true;
  });
  return (link) ? { id: link.server_id, type: link.type } : null;
}

export {
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
  findCommonServer,
};
