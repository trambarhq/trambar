// inside plv8_init() this points to the global object
var exports = exports || this;

exports.findChanges = function(before, after, omit) {
    var diff = {};
    var changes = false;
    var keys = Object.keys((before) ? before : after);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!omit || omit.indexOf(key) === -1) {
            var b = (before) ? before[key] : null;
            var a = (after) ? after[key] : null;
            if (!isEqual(b, a)) {
                diff[key] = [ b, a ];
                changes = true;
            }
        }
    }
    return (changes) ? diff : null;
};

exports.isEqual = function(before, after) {
    if (before === after) {
        return true;
    }
    if (before instanceof Array && after instanceof Array) {
        if (before.length !== after.length) {
            return false;
        }
        for (var i = 0; i < before.length; i++) {
            if (!isEqual(before[i], after[i])) {
                return false;
            }
        }
        return true;
    } else if (before instanceof Date && after instanceof Date) {
        return before.getTime() === after.getTime();
    } else if (before instanceof Object && after instanceof Object) {
        var keysB = Object.keys(before);
        var keysA = Object.keys(after);
        if (keysB.length !== keysA.length) {
            return false;
        }
        for (var i = 0; i < keysB.length; i++) {
            // JSON doesn't allow undefined, so if before has a key that
            // after doesn't have, before[name] will never equal after[name]
            var name = keysB[i];
            if (!isEqual(before[name], after[name])) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
};
var isEqual = exports.isEqual;

exports.sendChangeNotification = function(op, schema, table, before, after, changes, propNames) {
    var id = (after) ? after.id : before.id;
    var gn = (after) ? after.gn : before.gn;
    var diff = {}, previous = {}, current = {};
    // indicate which property is different
    for (var name in changes) {
        diff[name] = true;
    }
    for (var i = 0; i < propNames.length; i++) {
        var name = propNames[i];
        if (after) {
            current[name] = after[name];
        }
        if (diff[name]) {
            if (before) {
                previous[name] = before[name];
            }
        }
    }
    var info = { op, schema, table, id, gn, diff, previous, current };
    var channel = table + '_change';
    try {
        var msg = JSON.stringify(info);
        var sql = `NOTIFY ${channel}, ${plv8.quote_literal(msg)}`;
        plv8.execute(sql);
    } catch(err) {
        // store the message in the table message_queue if it's too large
        // for NOTIFY
        var sql = `
            INSERT INTO "message_queue" (message)
            VALUES ($1)
            RETURNING id
        `;
        var rows = plv8.execute(sql, [ info ]);
        if (rows.length > 0) {
            // send the id
            var sql = `NOTIFY ${channel}, '${rows[0].id}'`;
            plv8.execute(sql);
        }
    }
};

exports.sendCleanNotification = function(op, schema, table, after) {
    var id = after.id;
    var gn = after.gn;
    var atime = after.atime;
    var sample_count = after.sample_count || 0;
    var info = { op, schema, table, id, gn, atime, sample_count };
    var channel = table + '_clean';
    var msg = JSON.stringify(info);
    var sql = `NOTIFY ${channel}, ${plv8.quote_literal(msg)}`;
    plv8.execute(sql);
};

exports.matchObject = function(filters, object) {
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
                var objectExternal = object[name];
                var filterObject = filters[name];
                var filterExternal = [ filterObject ];
                var serverType = filterObject.type || '';
                var objectNames = [];
                for (var name in filterObject) {
                    var link = filterObject[name];
                    if (link.id || link.ids instanceof Array) {
                        objectNames.push(name);
                    }
                }
                var filterIdStrings = externalIdStrings(filterExternal, serverType, objectNames);
                var objectIdStrings = externalIdStrings(objectExternal, serverType, objectNames);
                if (filterIdStrings && objectIdStrings) {
                    for (var i = 0; i < filterIdStrings.length; i++) {
                        if (objectIdStrings.indexOf(filterIdStrings[i]) !== -1) {
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
};

exports.externalIdStrings = function(external, type, names) {
    var strings = [];
    if (external) {
        for (var i = 0; i < external.length; i++) {
            var link = external[i];
            if (link.type === type || !type) {
                var valid = true;
                var idLists = [];
                if (type) {
                    idLists.push([ link.server_id ]);
                } else {
                    idLists.push([]);
                }
                for (var j = 0; j < names.length; j++) {
                    var name = names[j];
                    var object = link[name];
                    if (!object) {
                        valid = false;
                        break;
                    }
                    if (object.ids instanceof Array) {
                        // multiple the lists
                        var ids = object.ids;
                        var newIdLists = [];
                        for (var k = 0; k < idLists.length; k++) {
                            var idList = idLists[k];
                            for (var m = 0; m < ids.length; m++) {
                                newIdLists.push(idList.concat(ids[m]));
                            }
                        }
                        idLists = newIdLists;
                    } else {
                        // add id to each list
                        for (var k = 0; k < idLists.length; k++) {
                            var idList = idLists[k];
                            idList.push(object.id);
                        }
                    }
                }
                if (valid) {
                    for (var k = 0; k < idLists.length; k++) {
                        var idList = idLists[k];
                        strings.push(idList.join(','));
                    }
                }
            }
        }
    }
    return (strings.length > 0) ? strings : null;
}

exports.transferProps = function(src, dst) {
    for (var name in src) {
        // copy property unless it's set already
        if (dst[name] == null) {
            dst[name] = src[name];
        }
    }
};

function matchTimeRanges(a, b) {
    // check if start-time or end-time of B is inside A
    var ar = parseRange(a), as = ar[0], ae = ar[1];
    var br = parseRange(b), bs = br[0], be = br[1];
    if ((ae && bs > ae) || (as && be < as)) {
        return false;
    }
    return true;
}

function parseRange(r) {
    if (r) {
        if (r.charAt(0) === '[' && r.charAt(r.length - 1) === ']' && r.indexOf(',') !== -1) {
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
        return a.indexOf(b) !== -1;
    } else if (typeof(a) !== 'object' && b instanceof(Array)) {
        return b.indexOf(a) !== -1;
    } else if (a instanceof Array && b instanceof Array) {
        for (var i = 0; i < a.length; i++) {
            if (b.indexOf(a[i]) !== -1) {
                return true;
            }
        }
    }
    return false;
}
