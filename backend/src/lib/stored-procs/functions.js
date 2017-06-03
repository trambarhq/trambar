exports.matchAny = function(filters, objects) {
    for (var i = 0; i < objects.length; i++) {
        if (matchObject(filters, objects[i])) {
            return true;
        }
    }
    return false;
};
exports.matchAny.args = 'filters jsonb, objects jsonb[]';
exports.matchAny.ret = 'boolean';
exports.matchAny.flags = 'IMMUTABLE';

exports.hasCandidate = function(details, storyId) {
    var candidates = details.candidates;
    if (candidates instanceof Array) {
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i].id === storyId) {
                return true;
            }
        }
    }
    return false;
};
exports.hasCandidate.args = 'details jsonb, storyId int';
exports.hasCandidate.ret = 'boolean';
exports.hasCandidate.flags = 'IMMUTABLE';

exports.invalidateCandidate = function(details, storyId) {
    var candidates = details.candidates;
    if (candidates instanceof Array) {
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i].id === storyId) {
                candidates[i].dirty = true;
                break;
            }
        }
    }
    return details;
};
exports.hasCandidate.args = 'details jsonb, storyId int';
exports.hasCandidate.ret = 'jsonb';
exports.hasCandidate.flags = 'IMMUTABLE';
