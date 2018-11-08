module.exports = {
    lowerCase,
    matchAny,
    hasFalse,
    hasCandidates,
    payloadTokens,
    updatePayload,
    checkAuthorization,
    extendAuthorization,
    externalIdStrings: require('./runtime').externalIdStrings,
    extractText,
    extractStoryText,
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

function hasFalse(details) {
    for (var name in details) {
        if (!details[name]) {
            return true;
        }
    }
    return false;
}
hasFalse.args = 'details jsonb';
hasFalse.ret = 'boolean';
hasFalse.flags = 'IMMUTABLE';

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
 * @return {Array<String>|null}
 */
function payloadTokens(details) {
    var tokens = [];
    var resources = details.resources;
    if (resources instanceof Array) {
        for (var i = 0; i < resources.length; i++) {
            var res = resources[i];
            if (res.payload_token) {
                tokens.push(res.payload_token);
            }
        }
    } else {
        if (details.payload_token) {
            tokens.push(details.payload_token);
        }
    }
    return (tokens.length > 0) ? tokens : null;
}
payloadTokens.args = 'details jsonb';
payloadTokens.ret = 'text[]';
payloadTokens.flags = 'IMMUTABLE';

/**
 * Copy properties of payload into matching resource
 *
 * @param  {Object} details
 * @param  {Object} payload
 *
 * @return {Object}
 */
function updatePayload(details, payload) {
    // use etime to determine if resource is ready, since progress can get
    // rounded to 100 before the final step
    var ready = (payload.completion === 100 && payload.etime !== null);
    var resources = details.resources;
    if (resources) {
        for (var i = 0; i < resources.length; i++) {
            var res = resources[i];
            if (res.payload_token === payload.token) {
                transferProps(payload.details, res);
            }
        }
    } else {
        // info is perhaps stored in the details object itself
        var res = details;
        if (res.payload_token === payload.token) {
            transferProps(payload.details, res);
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
    var sql = `SELECT user_id, area FROM "global"."session"
               WHERE token = $1
               AND (area = $2 OR $2 IS NULL)
               AND etime >= NOW()
               AND deleted = false
               AND activated = true
               LIMIT 1`;
    var row = plv8.execute(sql, [ token, area ])[0];
    return (row) ? row.user_id : null;
}
checkAuthorization.args = 'token text, area text';
checkAuthorization.ret = 'int';
checkAuthorization.flags = 'SECURITY DEFINER';

/**
 * Extend the expiration time by given number of days
 *
 * NOTE: Runs as root
 *
 * @param  {String} token
 * @param  {Number} days
 */
function extendAuthorization(token, days) {
    var sql = `UPDATE "global"."session"
               SET etime = NOW() + ($2 || ' day')::INTERVAL
               WHERE token = $1
               AND deleted = false`;
    plv8.execute(sql, [ token, days ]);
}
extendAuthorization.args = 'token text, days int';
extendAuthorization.ret = 'void';
extendAuthorization.flags = 'SECURITY DEFINER';

var externalIdStrings = module.exports.externalIdStrings;
externalIdStrings.args = 'external jsonb[], type text, names text[]';
externalIdStrings.ret = 'text[]';
externalIdStrings.flags = 'IMMUTABLE';

/**
 * Extract text from details column
 *
 * @param  {Object} details
 * @param  {String} lang
 *
 * @return {String}
 */
function extractText(details, lang) {
    var list = [];
    if (details.text && details.text[lang]) {
        list.push(details.text[lang]);
    }
    return list.join(' ');
}
extractText.args = 'details jsonb, lang text';
extractText.ret = 'text';
extractText.flags = 'IMMUTABLE';

/**
 * Extract text from story
 *
 * @param  {String} type
 * @param  {Object} details
 * @param  {Array<Object>} external
 * @param  {String} lang
 *
 * @return {String}
 */
function extractStoryText(type, details, external, lang) {
    var list = [];
    if (details.text && details.text[lang]) {
        list.push(details.text[lang]);
    }
    if (details.title) {
        list.push(details.title);
    }
    switch (type) {
        case 'issue':
            if (details.milestone) {
                list.push(details.milestone);
            }
            if (external instanceof Array) {
                external.forEach((link) => {
                    if (link.issue && link.issue.number) {
                        list.push(link.issue.number);
                    }
                });
            }
            break;
        case 'merge-request':
            if (details.milestone) {
                list.push(details.milestone);
            }
            if (details.branch) {
                list.push(details.branch);
            }
            if (details.source_branch) {
                list.push(details.source_branch);
            }
            break;
        case 'push':
        case 'merge':
            if (details.branch) {
                list.push(details.branch);
            }
            if (details.from_branches instanceof Array) {
                details.from_branches.forEach((branch) => {
                    list.push(branch);
                });
            }
            if (details.components instanceof Array) {
                details.components.forEach((component) => {
                    if (component && component.text && component.text[lang]) {
                        list.push(component.text[lang]);
                    }
                });
            }
            break;
        case 'branch':
        case 'tag':
            if (details.branch) {
                list.push(details.branch);
            }
            break;
    }
    return list.join(' ');
}
extractStoryText.args = 'type text, details jsonb, external jsonb[], lang text';
extractStoryText.ret = 'text';
extractStoryText.flags = 'IMMUTABLE';
