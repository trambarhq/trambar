var _ = require('lodash');

module.exports = ComponentRefs;

function ComponentRefs(specs) {
    if (!this) {
        return new ComponentRefs(specs);
    }
    var refs = this;
    var setters = {};
    _.forIn(specs, (propType, name) => {
        var f = function(value) {
            if (arguments.length > 0) {
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
