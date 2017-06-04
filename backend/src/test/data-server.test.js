var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;
var Request = require('request');

var Database = require('database');
var SchemaManager = require('schema-manager');

// service being tested
var DataServer = require('data-server');

// accessors
var Authentication = require('accessors/authentication');
var User = require('accessors/user');

var schema = 'test:DataServer';

describe('DataServer', function() {
    var testCredentials = {
        type: 'password',
        username: 'tester',
        password: 'qwerty',
    };
    var testUser = {
        name: 'tester',
        type: 'regular',
        details: {
            first_name: 'Agnes',
            last_name: 'Osinski',
        }
    };
    before(function() {
        if (!process.env.DOCKER_MOCHA) {
            return this.skip()
        }
        this.timeout(20000);
        return DataServer.start().then(() => {
            return Database.open(true).then((db) => {
                // drop test schema if it's there
                return db.schemaExists(schema).then((exists) => {
                    if (exists) {
                        return SchemaManager.deleteSchema(db, schema);
                    }
                }).then(() => {
                    return SchemaManager.createSchema(db, schema);
                }).then(() => {
                    return User.saveOne(db, 'global', testUser).then((user) => {
                        var auth = _.extend({ user_id: user.id }, testCredentials);
                        return Authentication.insertOne(db, 'global', auth).then((auth) => {
                            testUser = user;
                        });
                    });
                }).finally(() => {
                    return db.close();
                });
            });
        });
    })
    it('should fail to authenticate as non-existing user', function() {
        var url = 'http://localhost/api/authorization/';
        var badCredentials = _.extend({}, testCredentials, { username: 'no_one' });
        return retrieveData(url, badCredentials).then((resp) => {
            expect(resp).to.have.property('statusCode', 401);
        });
    })
    it('should fail to authenticate when given incorrect password', function() {
        var url = 'http://localhost/api/authorization/';
        var badCredentials = _.extend({}, testCredentials, { password: 'wrong' });
        return retrieveData(url, badCredentials).then((resp) => {
            expect(resp).to.have.property('statusCode', 401);
        });
    })
    it('should obtain an authorization token using the correct login information', function() {
        var url = 'http://localhost/api/authorization/';
        return retrieveData(url, testCredentials).then((resp) => {
            expect(resp.body).to.have.property('user_id');
            expect(resp.body).to.have.property('token');
        });
    })
    it('should be able to retrieve the test user record', function() {
        var url = 'http://localhost/api/retrieval/global/user/';
        var params = { ids: [ testUser.id ] };
        return retrieveProtectedData(url, params, testCredentials).then((resp) => {
            var user = resp.body[0];
            expect(user).to.have.property('id', testUser.id);
            expect(user).to.have.deep.property('details.first_name', testUser.details.first_name);
        });
    })
    after(function() {
        if (DataServer) {
            return DataServer.stop();
        }
    })
})

function retrieveProtectedData(url, payload, credentials) {
    var authUrl = 'http://localhost/api/authorization/'
    return retrieveData(authUrl, credentials).then((resp) => {
        if (resp.statusCode === 200) {
            // add token to payload
            payload.token = resp.body.token;
            return retrieveData(url, payload);
        } else {
            throw new Error(resp.statusMessage);
        }
    });
}

function retrieveData(url, payload) {
    return new Promise((resolve, reject) => {
        var options = {
            body: payload,
            json: true,
            url,
        };
        var req = Request.post(options, function(err, resp, body) {
            if (!err) {
                resolve(resp);
            } else {
                reject(err);
            }
        });
    });
}
