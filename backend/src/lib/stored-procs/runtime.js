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

exports.sendChangeNotification = function(op, schema, table, id, diff) {
    var info = { op, schema, table, id, diff };
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

exports.sendCleanNotification = function(op, schema, table, id) {
    var info = { op, schema, table, id };
    var channel = table + '_clean';
    var msg = JSON.stringify(info);
    var sql = `NOTIFY ${channel}, ${plv8.quote_literal(msg)}`;
    plv8.execute(sql);
};
