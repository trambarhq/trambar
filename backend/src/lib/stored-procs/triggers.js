exports.indicateDataChange = function(OLD, NEW) {
    var omit = [ 'id', 'gn', 'ctime', 'mtime' ];
    var diff = findChanges(OLD, NEW, omit);
    if (diff) {
        NEW.gn += 1;
        NEW.mtime = new Date;
    }
    return NEW;
};
exports.indicateDataChange.args = '';
exports.indicateDataChange.ret = 'trigger';

exports.notifyDataChange = function(OLD, NEW, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME) {
    var omit = [ 'id', 'gn', 'ctime', 'mtime' ];
    var diff = findChanges(OLD, NEW, omit);
    if (diff) {
        var id = (NEW) ? NEW.id : OLD.id;
        var gn = (NEW) ? NEW.gn : OLD.gn;
        sendChangeNotification(TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, id, gn, diff);
    }
};
exports.notifyDataChange.args = '';
exports.notifyDataChange.ret = 'trigger';

exports.indicateLiveDataChange = function(OLD, NEW) {
    var omit = [ 'id', 'gn', 'ctime', 'mtime', 'dirty', 'ltime', 'atime' ];
    var diff = findChanges(OLD, NEW, omit);
    if (diff) {
        NEW.gn += 1;
        NEW.mtime = new Date;
    }
    return NEW;
}
exports.indicateLiveDataChange.args = '';
exports.indicateLiveDataChange.ret = 'trigger';

exports.notifyLiveDataChange = function(OLD, NEW, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME) {
    var omit = [ 'id', 'gn', 'ctime', 'mtime', 'dirty', 'ltime', 'atime' ];
    var diff = findChanges(OLD, NEW, omit);
    if (diff) {
        var id = (NEW) ? NEW.id : OLD.id;
        var gn = (NEW) ? NEW.gn : OLD.gn;
        sendChangeNotification(TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, id, gn, diff);
    }

    // if the roll is dirty, we might need to do something to expedite its update
    if (NEW && NEW.dirty) {
        // if lock time isn't null, then the row will soon be updated
        if (!NEW.ltime) {
            var requestCleaning = false;
            if (!OLD || !OLD.dirty) {
                // the row has just become dirty
                requestCleaning = true;
            } else if (OLD.atime != NEW.atime) {
                // the row has just been accessed--ask for cleaning again
                // recipient(s) will understand the urgency by looking at the
                // atime
                requestCleaning = true;
            }
            if (requestCleaning) {
                var id = NEW.id;
                var atime = NEW.atime;
                var sampleCount = NEW.sample_count || 0;
                sendCleanNotification(TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, id, atime, sampleCount);
            }
        }
    }
};
exports.notifyLiveDataChange.args = '';
exports.notifyLiveDataChange.ret = 'trigger';

/**
 * Take results from Task table and move them into item in details.resources
 * with matching payload id
 */
exports.updateResource = function(OLD, NEW, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_ARGV) {
    // find rows in target table
    var payloadId = NEW.id;
    var details = NEW.details;
    var table = TG_ARGV[0];
    var readyColumn = TG_ARGV[1];
    var sql = `SELECT * FROM "${TG_TABLE_SCHEMA}"."${table}" WHERE "payloadIds"(details) @> $1`;
    var rows = plv8.execute(sql, [ [ payloadId ] ]);
    var ready = true;
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var resources = row.details.resources;
        var changed = false;
        for (var j = 0; j < resources.length; j++) {
            var res = resources[j];
            if (res.payload_id === payloadId) {
                for (var name in details) {
                    if (res[name] == null) {
                        res[name] = details[name];
                        changed = true;
                    }
                }
                if (NEW.completion === 100) {
                    res.payload_id = undefined;
                }
            }
            if (res.payload_id) {
                ready = false;
            }
        }
        if (changed) {
            var assignments = [ `details = $1` ];
            if (readyColumn && ready) {
                assignments.push(`${readyColumn} = true`);
            }
            var sql = `UPDATE "${TG_TABLE_SCHEMA}"."${table}" SET ${assignments.join(', ')} WHERE id = $2`;
            plv8.execute(sql, [ row.details, row.id ]);
        }
    }
};
exports.updateResource.args = '';
exports.updateResource.ret = 'trigger';
exports.updateResource.flags = 'SECURITY DEFINER';

/**
 * Take results from Task table and move them into details of row
 * with matching payload id
 */
exports.updateAlbum = function(OLD, NEW, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_ARGV) {
    var payloadId = NEW.id;
    var details = NEW.details;
    var table = TG_ARGV[0];
    var sql = `SELECT * FROM "${TG_TABLE_SCHEMA}"."${table}" WHERE (details->>'payload_id')::int = $1`;
    var rows = plv8.execute(sql, [ [ payloadId ] ]);
    var changed = false;
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var res = row.details;
        for (var name in details) {
            if (res[name] == null) {
                res[name] = details[name];
                changed = true;
            }
        }
        if (NEW.completion === 100) {
            res.payload_id = undefined;
            changed = true;
        }
    }
    if (changed) {
        var sql = `UPDATE "${TG_TABLE_SCHEMA}"."${TG_ARGV[0]}" SET details = $1 WHERE id = $2`;
        plv8.execute(sql, [ row.details, row.id ]);
    }
};
exports.updateAlbum.args = '';
exports.updateAlbum.ret = 'trigger';
exports.updateAlbum.flags = 'SECURITY DEFINER';
