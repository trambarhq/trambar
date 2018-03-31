var _ = require('lodash');

module.exports = {
    register,
    unregister,
    focus,
};

var entries = [];
var requests = [];

function register(component, props) {
    entries.unshift({ component, props });

    // see if a request for focus has been made
    requests = _.filter(requests, (request) => {
        if (_.isMatch(props, request)) {
            component.focus();
            return false;
        } else {
            return true;
        }
    });
}

function unregister(component) {
    entries = _.filter(entries, (entry) => {
        return (entry.component !== component);
    });
}

function focus(props) {
    var entry = _.find(entries, { props });
    if (entry) {
        entry.component.focus()
    } else {
        // store the request and set focus when component registers itself
        requests.push(props);
    }
}
