module.exports = {
    load
};

function load(importFuncs, progress) {
    return new Promise((resolve, reject) => {
        var keys = Object.keys(importFuncs);
        var modules = {};
        var loaded = 0;
        keys.forEach((key) => {
            var load = importFuncs[key];
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
