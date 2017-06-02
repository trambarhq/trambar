var _ = require('lodash');
var Promise = require('bluebird').config({ warnings: false });
var Chai = require('chai'), expect = Chai.expect;
var Database = require('database');

var SchemaManager = require('schema-manager');

describe('SchemaManager', function() {
    before(function() {
        if (!process.env.DOCKER_MOCHA) {
            return this.skip();
        }
        this.timeout(20000);
        return SchemaManager.start();
    })
    it('should have created the schema "global"', function() {
        return Database.open().then((db) => {
            return db.schemaExists('global').then((exists) => {
                expect(exists).to.be.true;
            });
        });
    })
    it('should have created user roles for the app to use', function() {
        return Database.open().then((db) => {
            var roles = ['internal_role', 'webfacing_role'];
            return Promise.map(roles, (role) => {
                return db.roleExists(role).then((exists) => {
                    expect(exists).to.be.true;
                });
            });
        });
    })
    it('should have set up the JavaScript runtime environment', function() {
        return Database.open().then((db) => {
            return db.functionExists('plv8_init').then((exists) => {
                expect(exists).to.be.true;
            });
        });
    })
    it('should have installed the PLv8 stored-procs', function() {
        var procs = require('stored-procs/functions');
        return Database.open().then((db) => {
            return Promise.map(_.keys(procs), (proc) => {
                return db.functionExists(proc).then((exists) => {
                    expect(exists).to.be.true;
                });
            });
        });
    })
    it('should have installed the PLv8 trigger functions', function() {
        var procs = require('stored-procs/triggers');
        return Database.open().then((db) => {
            return Promise.map(_.keys(procs), (proc) => {
                return db.functionExists(proc).then((exists) => {
                    expect(exists).to.be.true;
                });
            });
        });
    })
    it('should create a new project schema where a row is added to the project table', function() {
        return Database.open().then((db) => {
            var project = {
                name: 'test'
            };
            return db.schemaExists(project.name).then((exists) => {
                if (exists) {
                    // don't run the test if the schema is there already
                    this.skip();
                }
            }).then(() => {
                var Project = require('accessors/project');
                return Project.saveOne(db, 'global', project).delay(5000);
            }).then(() => {
                return db.schemaExists(project.name).then((exists) => {
                    expect(exists).to.be.true;
                });
            });
        })
    }).timeout(10000)
    after(function() {
        if (SchemaManager) {
            return SchemaManager.stop();
        }
    })
})
