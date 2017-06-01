var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;

var Database = require('database');

describe('LiveDataInvalidator', function() {
    var LiveDataInvalidator;
    before(function() {
        if (process.env.DOCKER_MOCHA) {
            // wait for the creation of the global and test schema
            this.timeout(20000);
            return Database.need([ 'global', 'test' ], 20000).then(() => {
                LiveDataInvalidator = require('live-data-invalidator');
                return LiveDataInvalidator.initialized;
            });
        } else {
            this.skip()
        }
    })
    it('should ', function() {
    })
    after(function() {
        if (LiveDataInvalidator) {
            return LiveDataInvalidator.exit();
        }
    })
})
