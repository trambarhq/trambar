module.exports = ComponentRefs;

var ReactDOM = require('react-dom');

function ComponentRefs(specs) {
    if (!this) {
        return new ComponentRefs(specs);
    }
    var refs = this;
    var setters = {};
    _.forIn(specs, (type, name) => {
        var f = function(value) {
            if (arguments.length > 0) {
                var isHTMLElement = false;
                if (type && type.prototype instanceof HTMLElement) {
                    isHTMLElement = true;
                }
                if (isHTMLElement) {
                    if (!(value instanceof HTMLElement)) {
                        value = ReactDOM.findDOMNode(value);
                    }
                }
                refs[name] = value;
            } else {
                return refs[name];
            }
        }
        setters[name] = f;
    });
    this.setters = setters;
    _.forIn(specs, (type, name) => {
        refs[name] = null;
    });
}
