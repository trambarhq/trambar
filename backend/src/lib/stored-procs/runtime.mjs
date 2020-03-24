function findChanges(before, after, omit) {
  const diff = {};
  const keys = Object.keys((before) ? before : after);
  let changes = false;
  for (let key of keys) {
    if (!omit || !omit.includes(key)) {
      var b = (before) ? before[key] : null;
      var a = (after) ? after[key] : null;
      if (!isEqual(b, a)) {
        diff[key] = [ b, a ];
        changes = true;
      }
    }
  }
  return (changes) ? diff : null;
}

function isEqual(before, after) {
  if (before === after) {
    return true;
  }
  if (before instanceof Array && after instanceof Array) {
    if (before.length !== after.length) {
      return false;
    }
    for (let i = 0; i < before.length; i++) {
      if (!isEqual(before[i], after[i])) {
        return false;
      }
    }
    return true;
  } else if (before instanceof Date && after instanceof Date) {
    return before.getTime() === after.getTime();
  } else if (before instanceof Object && after instanceof Object) {
    const keysB = Object.keys(before);
    const keysA = Object.keys(after);
    if (keysB.length !== keysA.length) {
      return false;
    }
    for (let key of keysB) {
      // JSON doesn't allow undefined, so if before has a key that
      // after doesn't have, before[key] will never equal after[key]
      if (!isEqual(before[key], after[key])) {
        return false;
      }
    }
    return true;
  } else {
    return false;
  }
}

function sendNotification(channel, info) {
  try {
    const msg = JSON.stringify(info);
    const sql = `NOTIFY ${channel}, ${plv8.quote_literal(msg)}`;
    plv8.execute(sql);
  } catch(err) {
    // store the message in the table message_queue if it's too large
    // for NOTIFY
    const sql = `
      INSERT INTO "message_queue" (message)
      VALUES ($1)
      RETURNING id
    `;
    const rows = plv8.execute(sql, [ info ]);
    if (rows.length > 0) {
      // send the id
      const sql = `NOTIFY ${channel}, '${rows[0].id}'`;
      plv8.execute(sql);
    }
  }
}

function sendChangeNotification(op, schema, table, before, after, changes, propNames) {
  const id = (after) ? after.id : before.id;
  const gn = (after) ? after.gn : before.gn;
  const diff = {}, previous = {}, current = {};
  // indicate which property is different
  for (let name in changes) {
    diff[name] = true;
  }
  for (let name of propNames) {
    if (after) {
      current[name] = after[name];
    }
    if (diff[name]) {
      if (before) {
        previous[name] = before[name];
      }
    }
  }
  const info = { op, schema, table, id, gn, diff, previous, current };
  const channel = table + '_change';
  sendNotification(channel, info);
}

function sendCleanNotification(op, schema, table, after) {
  const id = after.id;
  const gn = after.gn;
  const atime = after.atime;
  const sample_count = after.sample_count || 0;
  const info = { op, schema, table, id, gn, atime, sample_count };
  const channel = table + '_clean';
  sendNotification(channel, info);
}

function matchObject(filters, object) {
  for (var name in filters) {
    switch (name) {
      case 'time_range':
        if (!matchTimeRanges(filters[name], object[name])) {
          return false;
        }
        break;
      case 'tz_offset':
        break;
      case 'external_object':
        // this function expects object properties to have the same
        // names as the filters operating on them
        //
        // so the external array is in "external_object"
        const objectExternal = object[name];
        const filterObject = filters[name];
        const filterExternal = [ filterObject ];
        const serverType = filterObject.type || '';
        const objectNames = [];
        for (let [ name, link ] of filterObject) {
          if (link.id || link.ids instanceof Array) {
            objectNames.push(name);
          }
        }
        const filterIdStrings = externalIdStrings(filterExternal, serverType, objectNames);
        const objectIdStrings = externalIdStrings(objectExternal, serverType, objectNames);
        if (filterIdStrings && objectIdStrings) {
          for (let filterIdString of filterIdStrings) {
            if (objectIdStrings.includes(filterIdString)) {
              return true;
            }
          }
        }
        return false;
      default:
        if (!matchScalars(filters[name], object[name])) {
          return false;
        }
    }
  }
  return true;
}

function externalIdStrings(external, type, names) {
  const strings = [];
  if (external) {
    for (let link of external) {
      if (link.type === type || !type) {
        let idLists = [];
        if (type) {
          idLists.push([ link.server_id ]);
        } else {
          idLists.push([]);
        }
        let valid = true;
        for (let name of names) {
          const object = link[name];
          if (!object) {
            valid = false;
            break;
          }
          if (object.ids instanceof Array) {
            // multiple the lists
            const newIdLists = [];
            for (let idList of idLists) {
              for (let id of object.ids) {
                newIdLists.push(idList.concat(id));
              }
            }
            idLists = newIdLists;
          } else {
            // add id to each list
            for (let idList of idLists) {
              idList.push(object.id);
            }
          }
        }
        if (valid) {
          for (let idList of idLists) {
            strings.push(idList.join(','));
          }
        }
      }
    }
  }
  return (strings.length > 0) ? strings : null;
}

function transferProps(src, dst) {
  for (let name in src) {
    // copy property unless it's set already
    if (dst[name] == null) {
      dst[name] = src[name];
    }
  }
}

function matchTimeRanges(a, b) {
  // check if start-time or end-time of B is inside A
  const ar = parseRange(a), as = ar[0], ae = ar[1];
  const br = parseRange(b), bs = br[0], be = br[1];
  if ((ae && bs > ae) || (as && be < as)) {
    return false;
  }
  return true;
}

function parseRange(r) {
  if (r) {
    if (r.charAt(0) === '[' && r.charAt(r.length - 1) === ']' && r.includes(',')) {
      return r.substr(1, r.length - 1).split(',')
    } else {
      // it's actually a timestamp
      return [ r, r ];
    }
  } else {
    return [ '', '' ];
  }
}

function matchScalars(a, b) {
  if (typeof(a) !== 'object' && typeof(b) !== 'object') {
    return a === b;
  } else if (a instanceof Array && typeof(b) !== 'object') {
    return a.includes(b);
  } else if (typeof(a) !== 'object' && b instanceof(Array)) {
    return b.includes(a);
  } else if (a instanceof Array && b instanceof Array) {
    for (var i = 0; i < a.length; i++) {
      if (b.includes(a[i])) {
        return true;
      }
    }
  }
  return false;
}

function broadcastLogMessage(type, ...args) {
  const channel = `console_${type}`;
  sendNotification(channel, args);
}

function __init__() {
  // inside plv8_init() this points to the global object
  this.console = {
    info: broadcastLogMessage.bind(null, 'warn'),
    log: broadcastLogMessage.bind(null, 'log'),
    warn: broadcastLogMessage.bind(null, 'warn'),
    error: broadcastLogMessage.bind(null, 'error'),
    debug: broadcastLogMessage.bind(null, 'debug'),
  };
  this.findChanges = findChanges;
  this.isEqual = isEqual;
  this.sendChangeNotification = sendChangeNotification;
  this.sendCleanNotification = sendCleanNotification;
  this.matchObject = matchObject;
  this.externalIdStrings = externalIdStrings;
  this.transferProps = transferProps;
}

export {
  findChanges,
  isEqual,
  sendNotification,
  sendChangeNotification,
  sendCleanNotification,
  matchObject,
  matchScalars,
  matchTimeRanges,
  parseRange,
  externalIdStrings,
  transferProps,
  broadcastLogMessage,
  __init__,
};
