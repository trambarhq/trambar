var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;
var Request = require('request');

var Database = require('database');

describe('DataServer', function() {
    var DataServer;
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
        if (process.env.DOCKER_MOCHA) {
            // wait for the creation of the global and test schema
            this.timeout(20000);
            return Database.need([ 'global', 'test' ], 20000).then(() => {
                DataServer = require('data-server');
                return DataServer.initialized;
            }).then(() => {
                return Database.open().then((db) => {
                    var User = require('accessors/user');
                    return User.saveOne(db, 'global', testUser).then((user) => {
                        var Authentication = require('accessors/authentication');
                        var auth = _.extend({ user_id: user.id }, testCredentials);
                        return Authentication.insertOne(db, 'global', auth).then((auth) => {
                            testUser = user;
                        });
                    });
                });
            });
        } else {
            this.skip()
        }
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
            return DataServer.exit();
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
