import { expect } from 'chai';

import {
  preload
} from '../bootstrap-loader.js';

describe('BootstrapLoader', function() {
  it('should load the modules, reporting progress as each becomes available', async function() {
    let funcs = {
      a: () => import('./modules/a'),
      b: () => import('./modules/b'),
      c: () => import('./modules/c'),
    };
    let ready = {
      a: false,
      b: false,
      c: false,
    };
    let progress = (loaded, total, key) => {
      ready[key] = true;
    };
    let modules = await preload(funcs, progress);
    for (let state of Object.values(ready)) {
      expect(state).to.be.true;
    }
    for (let [ name, module ] of Object.entries(modules)) {
      expect(module).to.have.property('name', name);
    }
  })
})
