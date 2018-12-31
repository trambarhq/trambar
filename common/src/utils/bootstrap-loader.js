async function load(importFuncs, progress) {
    let modules = {};
    let loaded = 0;
    let entries = Object.entries(importFuncs);
    for (let [ key, load ] of entries) {
        if (progress) {
            progress(loaded, entries.length);
        }
        try {
            let module = await load();
            modules[key] = module;
            loaded++;
        } catch (err) {
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
        }
    }
    if (progress) {
        progress(loaded, entries.length);
    }
    return modules;
}

export {
    load,
};
