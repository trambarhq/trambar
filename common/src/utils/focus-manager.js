var _ = require('lodash');

module.exports = {
    register,
    unregister,
    focus,
};

var entries = [];

function register(component, props) {
    entries.unshift({ component, props });
}

function unregister(component) {
    _.pull(entries, { component });
}

function focus(props) {
    //console.log('focus', props);
    var attempts = 0;
    var interval = setInterval(() => {
        var entry = _.find(entries, { props });
        if (entry) {
            try {
                entry.component.focus();
            } catch (err) {
                console.error(err);
            }
            clearInterval(interval);
        } else {
            attempts++;
            if (attempts > 10) {
                clearInterval(interval);
            }
        }
    }, 10);
}
