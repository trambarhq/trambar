function load(importFuncs, progress) {
    return new Promise((resolve, reject) => {
        let keys = Object.keys(importFuncs);
        let modules = {};
        let loaded = 0;
        if (progress) {
            progress(loaded, keys.length);
        }
        keys.forEach((key) => {
            let load = importFuncs[key];
            load().then((module) => {
                modules[key] = module;
                loaded++;
                if (progress) {
                    progress(loaded, keys.length, key);
                }
                if (loaded === keys.length) {
                    resolve(modules);
                }
            }).catch((err) => {
                console.error(err);
                if (reject) {
                    reject(err);
                    reject = null;
                }
            });
        });
    });
}

export {
    load,
};
