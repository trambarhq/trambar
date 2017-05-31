if (process.env.DOCKER_MOCHA) {
    var _ = require('lodash');
    var Promise = require('bluebird');
    var Chai = require('chai'), expect = Chai.expect;

    var SchemaManager = require('schema-manager');
    var Database = require('database');

    describe('SchemaManager', () => {
        it('should call the onReady handler at some point', () => {
            return new Promise((resolve, reject) => {
                SchemaManager.onReady = () => {
                    resolve();
                };
            });
        }).timeout(10000);
        it('should have created the schema "global"', () => {
            return Database.open().then((db) => {
                return db.schemaExists('global').then((exists) => {
                    expect(exists).to.be.true;
                });
            });
        })
        it('should have created user roles for the app to use', () => {
            return Database.open().then((db) => {
                var roles = ['internal_role', 'webfacing_role'];
                return Promise.map(roles, (role) => {
                    return db.roleExists(role).then((exists) => {
                        expect(exists).to.be.true;
                    });
                });
            });
        })
        it('should have set up the JavaScript runtime environment', () => {
            return Database.open().then((db) => {
                return db.functionExists('plv8_init').then((exists) => {
                    expect(exists).to.be.true;
                });
            });
        })
        it('should have installed the PLv8 stored-procs', () => {
            var procs = require('stored-procs/functions');
            return Database.open().then((db) => {
                return Promise.map(_.keys(procs), (proc) => {
                    return db.functionExists(proc).then((exists) => {
                        expect(exists).to.be.true;
                    });
                });
            });
        })
        it('should have installed the PLv8 trigger functions', () => {
            var procs = require('stored-procs/triggers');
            return Database.open().then((db) => {
                return Promise.map(_.keys(procs), (proc) => {
                    return db.functionExists(proc).then((exists) => {
                        expect(exists).to.be.true;
                    });
                });
            });
        })
        it('should create a new project schema where a row is added to the project table', () => {
            var Project = require('accessors/project');
            return Database.open().then((db) => {
                var project = {
                    name: 'hello' + Math.round(Math.random() * 100)
                };
                return Project.saveOne(db, 'global', project).then((row) => {
                    // give it a bit of time
                    return Promise.delay(500);
                }).then(() => {
                    return db.schemaExists(project.name).then((exists) => {
                        expect(exists).to.be.false;
                    });
                });
            });
        })
    })
}
