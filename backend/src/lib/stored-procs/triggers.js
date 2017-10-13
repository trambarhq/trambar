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
    var table = TG_ARGV[0];
    var readyColumn = TG_ARGV[1];
    var publishedColumn = TG_ARGV[2];

    var payload = {
        id: NEW.id,
        details: NEW.details,
        completion: NEW.completion,
    };
    var params = [];
    var payloadId = `$${params.push([ payload.id ])}`;
    var payloadDetails = `$${params.push(payload)}`;
    var clear = publishedColumn || 'true';
    var newDetails = `"updatePayload"(details, ${payloadDetails}, ${clear})`;
    var assignments = [ `details = ${newDetails}` ];
    if (readyColumn) {
        // set ready column to true if there are no more payload ids
        assignments.push(`${readyColumn} = "payloadIds"(${newDetails}) IS NULL`);
    }
    var sql = `
        UPDATE "${TG_TABLE_SCHEMA}"."${table}"
        SET ${assignments.join(', ')}
        WHERE "payloadIds"(details) @> ${payloadId}
    `;
    plv8.execute(sql, params);
};
exports.updateResource.args = '';
exports.updateResource.ret = 'trigger';
exports.updateResource.flags = 'SECURITY DEFINER';

/**
 * Take results from Task table and move them into details of row
 * with matching payload id
 */
exports.updateAlbum = function(OLD, NEW, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_ARGV) {
    var table = TG_ARGV[0];

    var params = [];
    var payload = {
        id: NEW.id,
        details: NEW.details,
        completion: NEW.completion,
    };
    var payloadId = `$${params.push([ payload.id ])}`;
    var payloadDetails = `$${params.push(payload)}`;
    var newDetails = `"updatePayload"(details, ${payloadDetails}, true)`;
    var assignments = [ `details = ${newDetails}` ];
    var sql = `
        UPDATE "${TG_TABLE_SCHEMA}"."${table}"
        SET ${assignments.join(', ')}
        WHERE (details->>'payload_id')::int = ${payloadId}
    `;
    plv8.elog(NOTICE, sql);
    plv8.execute(sql, params);

};
exports.updateAlbum.args = '';
exports.updateAlbum.ret = 'trigger';
exports.updateAlbum.flags = 'SECURITY DEFINER';
