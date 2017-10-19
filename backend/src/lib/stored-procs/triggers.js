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
    var payload = {
        id: NEW.id,
        details: NEW.details,
        completion: NEW.completion,
    };
    var params = [];
    var sql = `
        UPDATE "${TG_TABLE_SCHEMA}"."${TG_ARGV[0]}"
        SET details = "updatePayload"(details, $${params.push(payload)})
        WHERE "payloadIds"(details) @> $${params.push([ payload.id ])}
    `;
    plv8.execute(sql, params);
};
exports.updateResource.args = '';
exports.updateResource.ret = 'trigger';
exports.updateResource.flags = 'SECURITY DEFINER';

/**
 * Ensure that information inserted on into details.resources by updateResource()
 * doesn't get overridden by stale data
 */
exports.coalesceResources = function(OLD, NEW, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_ARGV) {
    var oldResources = (OLD) ? OLD.details.resources || [] : [];
    var newResources = NEW.details.resources;
    if (!oldResources && !newResources) {
        if (NEW.details.payload_id) {
            oldResources = (OLD) ? [ OLD.details ] : [];
            newResources = [ NEW.details ];
        }
    }
    if (newResources) {
        for (var i = 0; i < newResources.length; i++) {
            var newRes = newResources[i];
            if (newRes.payload_id) {
                for (var j = 0; j < oldResources.length; j++) {
                    var oldRes = oldResources[j];
                    if (newRes.payload_id === oldRes.payload_id) {
                        transferProps(oldRes, newRes);
                        break;
                    }
                }
            }
        }
    }

    var readyColumn = TG_ARGV[0];
    var publishedColumn = TG_ARGV[1];
    var allReady = true;
    if (newResources) {
        for (var i = 0; i < newResources.length; i++) {
            var newRes = newResources[i];
            if (newRes.payload_id) {
                if (newRes.ready !== true) {
                    allReady = false;
                    break;
                }
            }
        }
        if (allReady) {
            if (!publishedColumn || NEW[publishedColumn]) {
                for (var i = 0; i < newResources.length; i++) {
                    var newRes = newResources[i];
                    delete newRes.ready;
                    delete newRes.payload_id;
                }
            }
        }
    }
    if (readyColumn) {
        NEW[readyColumn] = allReady;
    }
    return NEW;
}
exports.coalesceResources.args = '';
exports.coalesceResources.ret = 'trigger';
exports.coalesceResources.flags = 'SECURITY DEFINER';
