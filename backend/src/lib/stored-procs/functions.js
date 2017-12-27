module.exports = {
    lowerCase,
    matchAny,
    hasCandidates,
    payloadIds,
    updatePayload,
    checkAuthorization,
    extendAuthorization,
    externalIdStrings: require('./runtime').externalIdStrings
};

/**
 * Convert strings in an array to lower case
 *
 * @param  {Array<String>} strings
 *
 * @return {Array<String>}
 */
function lowerCase(strings) {
    for (var i = 0; i < strings.length; i++) {
        strings[i] = strings[i].toLowerCase();
    }
    return strings;
}
lowerCase.args = 'strings text[]';
lowerCase.ret = 'text[]';
lowerCase.flags = 'IMMUTABLE';

function matchAny(filters, objects) {
    for (var i = 0; i < objects.length; i++) {
        if (matchObject(filters, objects[i])) {
            return true;
        }
    }
    return false;
}
matchAny.args = 'filters jsonb, objects jsonb[]';
matchAny.ret = 'boolean';
matchAny.flags = 'IMMUTABLE';

function hasCandidates(details, ids) {
    var candidates = details.candidates;
    if (candidates instanceof Array) {
        for (var i = 0; i < candidates.length; i++) {
            var id = candidates[i].id;
            for (var j = 0; j < ids.length; j++) {
                if (id === ids[j]) {
                    return true;
                }
            }
        }
    }
    return false;
}
hasCandidates.args = 'details jsonb, ids int[]';
hasCandidates.ret = 'boolean';
hasCandidates.flags = 'IMMUTABLE';

/**
 * Return a list of payload ids contained in the object
 *
 * @param  {Object} details
 *
 * @return {Array<Number>|null}
 */
function payloadIds(details) {
    var payloadIds = [];
    var resources = details.resources;
    if (resources instanceof Array) {
        for (var i = 0; i < resources.length; i++) {
            var res = resources[i];
            if (res.payload_id) {
                payloadIds.push(res.payload_id);
            }
        }
    } else {
        if (details.payload_id) {
            payloadIds.push(details.payload_id);
        }
    }
    return (payloadIds.length > 0) ? payloadIds : null;
}
payloadIds.args = 'details jsonb';
payloadIds.ret = 'int[]';
payloadIds.flags = 'IMMUTABLE';

/**
 * Copy properties of payload into matching resource
 *
 * @param  {Object} details
 * @param  {Object} payload
 *
 * @return {Object}
 */
function updatePayload(details, payload) {
    var resources = details.resources;
    if (resources) {
        for (var i = 0; i < resources.length; i++) {
            var res = resources[i];
            if (res.payload_id === payload.id) {
                transferProps(payload.details, res);
                res.ready = (payload.completion === 100);
            }
        }
    } else {
        // info is perhaps stored in the details object itself
        var res = details;
        if (res.payload_id === payload.id) {
            transferProps(payload.details, res);
            res.ready = (payload.completion === 100);
        }
    }
    return details;
}
updatePayload.args = 'details jsonb, payload jsonb';
updatePayload.ret = 'jsonb';
updatePayload.flags = 'IMMUTABLE';

/**
 * Return user id associated with authorization token--if it's still valid
 *
 * NOTE: Runs as root
 *
 * @param  {String} token
 * @param  {String} area
 *
 * @return {Number}
 */
function checkAuthorization(token, area) {
    var sql = `SELECT user_id, area FROM "global"."authorization"
               WHERE token = $1
               AND (area = $2 OR $2 IS NULL)
               AND expiration_date >= current_date
               AND deleted = false
               LIMIT 1`;
    var row = plv8.execute(sql, [ token, area ])[0];
    return (row) ? row.user_id : null;
}
checkAuthorization.args = 'token text, area text';
checkAuthorization.ret = 'int';
checkAuthorization.flags = 'SECURITY DEFINER';

/**
 * Set the expiration date of an authorization object
 *
 * NOTE: Runs as root
 *
 * @param  {String} token
 * @param  {String} expire
 */
function extendAuthorization(token, expire) {
    var sql = `UPDATE "global"."authorization"
               SET expiration_date = $2
               WHERE token = $1
               AND deleted = false`;
    plv8.execute(sql, [ token, expire ]);
}
extendAuthorization.args = 'token text, expire date';
extendAuthorization.ret = 'void';
extendAuthorization.flags = 'SECURITY DEFINER';

var externalIdStrings = module.exports.externalIdStrings;
externalIdStrings.args = 'external jsonb[], type text, names text[]';
externalIdStrings.ret = 'text[]';
externalIdStrings.flags = 'IMMUTABLE';
