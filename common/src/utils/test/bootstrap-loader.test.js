var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var BootstrapLoader = require('utils/bootstrap-loader');

describe('BootstrapLoader', function() {
    it('should load the modules, reporting progress as each becomes available', function() {
        var funcs = {
            a: () => import('./modules/a'),
            b: () => import('./modules/b'),
            c: () => import('./modules/c'),
        };
        var ready = {
            a: false,
            b: false,
            c: false,
        };
        var progress = (loaded, total, key) => {
            ready[key] = true;
        };
        BootstrapLoader.load(funcs, progress).then((modules) => {
            _.each(ready, (state) => {
                expect(state).to.be.true;
            });
            _.each(modules, (module, name) => {
                expect(module).to.have.property('name', name);
            })
        });
    })
})
