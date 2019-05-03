function ComponentRefs(specs) {
    if (!this) {
        return new ComponentRefs(specs);
    }
    let refs = this;
    let setters = {};
    for (let name in specs) {
        let type = specs[name];
        let f = function(value) {
            if (arguments.length > 0) {
                refs[name] = value;
            } else {
                return refs[name];
            }
        }
        setters[name] = f;
        refs[name] = null;
    };
    this.setters = setters;    
}

export {
    ComponentRefs as default,
    ComponentRefs,
};
