async function preload(importFuncs, progress) {
  let loaded = 0;
  const entries = Object.entries(importFuncs);
  for (let [ key, load ] of entries) {
    if (progress) {
      progress(loaded, entries.length, key);
    }
    try {
      await load();
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
}

export {
  preload,
};
