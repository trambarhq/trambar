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
        sendChangeNotification(TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, id, diff);
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
        sendChangeNotification(TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, id, diff);
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
                sendCleanNotification(TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.id, NEW.atime);
            }
        }
    }
};
exports.notifyLiveDataChange.args = '';
exports.notifyLiveDataChange.ret = 'trigger';
