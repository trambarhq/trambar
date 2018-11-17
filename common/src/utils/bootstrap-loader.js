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
                if (/Loading chunk/i.test(err.message)) {
                    if (typeof(performance) === 'object' && typeof(performance.navigation) === 'object') {
                        if (performance.navigation.type !== 1) {
                            if (navigator.onLine) {
                                // force reloading from server
                                console.log('Reloading page...');
                                location.reload(true);
                            }
                        }
                    }
                }
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
