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

exports.hasCandidates = function(details, storyIds) {
    var candidates = details.candidates;
    if (candidates instanceof Array) {
        for (var i = 0; i < candidates.length; i++) {
            var id = candidates[i].id;
            for (var j = 0; j < storyIds.length; j++) {
                if (id === storyIds[j]) {
                    return true;
                }
            }
        }
    }
    return false;
};
exports.hasCandidate.args = 'details jsonb, storyId int';
exports.hasCandidate.ret = 'boolean';
exports.hasCandidate.flags = 'IMMUTABLE';
