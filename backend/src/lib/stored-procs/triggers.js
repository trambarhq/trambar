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
    var omit = [ 'dirty', 'ltime', 'atime' ];
    var diff = findChanges(OLD, NEW, omit);
    if (diff) {
        NEW.gn += 1;
        NEW.mtime = new Date;
    }
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

    if (NEW && OLD) {
        if (NEW.dirty) {
            if (NEW.atime && !NEW.ltime) {
                if (OLD.atime != NEW.atime) {
                    var id = NEW.id;
                    sendCleanNotification(TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, id);
                }
            }
        }
    }
};
exports.notifyLiveDataChange.args = '';
exports.notifyLiveDataChange.ret = 'trigger';
