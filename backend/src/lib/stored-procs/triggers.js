module.exports = {
    indicateDataChange,
    notifyDataChange,
    indicateLiveDataChange,
    notifyLiveDataChange,
    updateResource,
    coalesceResources,
};

function indicateDataChange(OLD, NEW) {
    var omit = [ 'id', 'gn', 'ctime', 'mtime' ];
    var changes = findChanges(OLD, NEW, omit);
    if (changes) {
        NEW.gn += 1;
        NEW.mtime = new Date;
    }
    return NEW;
}
indicateDataChange.args = '';
indicateDataChange.ret = 'trigger';

function notifyDataChange(OLD, NEW, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_ARGV) {
    var omit = [ 'id', 'gn', 'ctime', 'mtime' ];
    var changes = findChanges(OLD, NEW, omit);
    if (changes) {
        sendChangeNotification(TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, OLD, NEW, changes, TG_ARGV);
    }
}
notifyDataChange.args = '';
notifyDataChange.ret = 'trigger';

function indicateLiveDataChange(OLD, NEW) {
    var omit = [ 'id', 'gn', 'ctime', 'mtime', 'dirty', 'ltime', 'atime' ];
    var changes = findChanges(OLD, NEW, omit);
    if (changes) {
        NEW.gn += 1;
        NEW.mtime = new Date;
    }
    return NEW;
}
indicateLiveDataChange.args = '';
indicateLiveDataChange.ret = 'trigger';

function notifyLiveDataChange(OLD, NEW, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_ARGV) {
    var omit = [ 'id', 'gn', 'ctime', 'mtime', 'dirty', 'ltime', 'atime' ];
    var changes = findChanges(OLD, NEW, omit);
    if (changes) {
        sendChangeNotification(TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, OLD, NEW, changes, TG_ARGV);
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
                sendCleanNotification(TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW);
            }
        }
    }
}
notifyLiveDataChange.args = '';
notifyLiveDataChange.ret = 'trigger';

/**
 * Take results from Task table and move them into item in details.resources
 * with matching payload id
 */
function updateResource(OLD, NEW, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_ARGV) {
    var payload = {
        token: NEW.token,
        details: NEW.details,
        completion: NEW.completion,
        etime: NEW.etime,
    };
    var params = [];
    var sql = `
        UPDATE "${TG_TABLE_SCHEMA}"."${TG_ARGV[0]}"
        SET details = "updatePayload"(details, $${params.push(payload)})
        WHERE "payloadTokens"(details) @> $${params.push([ payload.token ])}
    `;
    plv8.execute(sql, params);
}
updateResource.args = '';
updateResource.ret = 'trigger';
updateResource.flags = 'SECURITY DEFINER';

/**
 * Ensure that information inserted on into details.resources by updateResource()
 * doesn't get overridden by stale data
 */
function coalesceResources(OLD, NEW, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_ARGV) {
    var oldResources = (OLD) ? OLD.details.resources : undefined;
    var newResources = NEW.details.resources;
    if (!oldResources && !newResources) {
        if (NEW.details.payload_token) {
            oldResources = (OLD) ? [ OLD.details ] : undefined;
            newResources = [ NEW.details ];
        }
    }
    if (newResources && oldResources) {
        for (var i = 0; i < newResources.length; i++) {
            var newRes = newResources[i];
            if (newRes.payload_token) {
                for (var j = 0; j < oldResources.length; j++) {
                    var oldRes = oldResources[j];
                    if (newRes.payload_token === oldRes.payload_token) {
                        transferProps(oldRes, newRes);
                        break;
                    }
                }
            }
        }
    }

    // remove ready and payload_token from resources once they're all ready
    // and the object itself is published
    var readyColumn = TG_ARGV[0];
    var publishedColumn = TG_ARGV[1];
    var allReady = true;
    if (newResources) {
        for (var i = 0; i < newResources.length; i++) {
            var newRes = newResources[i];
            if (newRes.payload_token) {
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
                    delete newRes.payload_token;
                }
            }
        }
    }
    // set ready column when all resources are ready
    if (readyColumn) {
        NEW[readyColumn] = allReady;
    }
    return NEW;
}
coalesceResources.args = '';
coalesceResources.ret = 'trigger';
coalesceResources.flags = 'SECURITY DEFINER';
