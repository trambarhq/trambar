var React = require('react'), PropTypes = React.PropTypes;

var diagnosticsContents = {};
var listeners = [];
var immediate = 0;

module.exports = Diagnostics;

function Diagnostics(props) {
    var type = props.type;
    var contents = props.children;
    diagnosticsContents[type] = contents;
    if (!immediate) {
        immediate = setImmediate(() => {
            immediate = 0;
            _.each(listeners, (f) => {
                f({
                    type: 'change',
                    target: module.exports,
                });
            });
        });
    }
    return null;
}

Diagnostics.propTypes = {
    type: PropTypes.string.isRequired,
};

Diagnostics.get = function(type) {
    return diagnosticsContents[type];
};

Diagnostics.addListener = function(listener) {
    if (listener) {
        listeners.push(listener);
    }
};

Diagnostics.removeListener = function(listener) {
    _.pull(listeners, listener);
};
