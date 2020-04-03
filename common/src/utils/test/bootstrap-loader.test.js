import { expect } from 'chai';

import {
  preload
} from '../bootstrap-loader.js';

describe('BootstrapLoader', function() {
  it('should load the modules, reporting progress as each becomes available', async function() {
    const funcs = {
      a: () => import('./modules/a'),
      b: () => import('./modules/b'),
      c: () => import('./modules/c'),
    };
    const ready = {
      a: false,
      b: false,
      c: false,
    };
    const progress = (loaded, total, key) => {
      ready[key] = true;
    };
    const modules = await preload(funcs, progress);
    for (let state of Object.values(ready)) {
      expect(state).to.be.true;
    }
  })
})
