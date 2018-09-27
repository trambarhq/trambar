import _ from 'lodash';

let entries = [];
let requests = [];

function register(component, props) {
    entries.unshift({ component, props });

    // see if a request for focus has been made
    requests = _.filter(requests, (request) => {
        if (_.isMatch(props, request)) {
            debugger;
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
    let entry = _.find(entries, { props });
    if (entry) {
        debugger;
        entry.component.focus()
    } else {
        // store the request and set focus when component registers itself
        requests.push(props);
    }
}

export {
    register,
    unregister,
    focus,
};
