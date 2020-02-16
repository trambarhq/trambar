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
var Statistics = require('accessors/statistics');
var Listing = require('accessors/listing');
var User = require('accessors/user');

var schema = 'test:DataServer';


describe('DataServer', function() {
  var now = (new Date).toISOString();
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
  var testListings = {
    old_0_new_3: {
      type: 'news',
      details: {
        stories: [],
        candidates: [
          { id: 101, rating: 1, ptime: '2017-05-04T20:02:42.060Z' },
          { id: 102, rating: 2, ptime: '2017-05-04T21:02:42.060Z' },
          { id: 103, rating: 1, ptime: '2017-05-04T22:02:42.060Z' },
        ]
      },
      filters: {
        limit: 5
      },
      target_user_id: 1,
    },
    old_5_new_4: {
      type: 'news',
      details: {
        stories: [
          { id: 101, rtime: '2017-06-04T20:02:42.060Z' },
          { id: 102, rtime: '2017-06-04T20:02:42.060Z' },
          { id: 103, rtime: '2017-06-04T20:02:42.060Z' },
          { id: 104, rtime: now },
          { id: 105, rtime: now },
        ],
        candidates: [
          { id: 106, rating: 3, ptime: '2017-05-04T20:02:42.060Z' },
          { id: 107, rating: 2, ptime: '2017-05-04T21:02:42.060Z' },
          { id: 108, rating: 1, ptime: '2017-05-04T22:02:42.060Z' },
          { id: 109, rating: 4, ptime: '2017-05-04T23:02:42.060Z' },
        ]
      },
      filters: {
        limit: 5
      },
      target_user_id: 1,
    },
    old_5_new_8: {
      type: 'news',
      details: {
        stories: [
          { id: 101, rtime: now },
          { id: 102, rtime: now },
          { id: 103, rtime: now },
          { id: 104, rtime: now },
          { id: 105, rtime: now },
        ],
        candidates: [
          { id: 106, rating: 1, ptime: '2017-05-04T20:02:42.060Z' },
          { id: 107, rating: 2, ptime: '2017-05-04T21:02:42.060Z' },
          { id: 108, rating: 1, ptime: '2017-05-04T22:02:42.060Z' },
          { id: 109, rating: 9, ptime: '2017-05-04T23:02:42.060Z' },
          { id: 110, rating: 9, ptime: '2017-05-05T01:02:42.060Z' },
          { id: 111, rating: 7, ptime: '2017-05-05T02:02:42.060Z' },
          { id: 112, rating: 7, ptime: '2017-05-05T03:02:42.060Z' },
          { id: 113, rating: 8, ptime: '2017-05-05T04:02:42.060Z' },
        ]
      },
      filters: {
        limit: 5
      },
      target_user_id: 1,
    },
    all: {
      type: 'user-activities',
      details: {
        stories: [],
        candidates: [
          { id: 101, rating: 1, ptime: '2017-05-04T20:02:42.060Z' },
          { id: 102, rating: 2, ptime: '2017-05-04T21:02:42.060Z' },
          { id: 103, rating: 1, ptime: '2017-05-04T22:02:42.060Z' },
        ]
      },
      filters: {
        limit: 5
      },
      target_user_id: 1,
    },
    roleSpecific: {
      type: 'user-activities',
      details: {
        stories: [],
        candidates: [
          { id: 101, rating: 1, ptime: '2017-05-04T20:02:42.060Z' },
        ]
      },
      filters: {
        limit: 5
      },
      target_user_id: 1,
    },
  }
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
        }).then(() => {
          // create test listings
          var testRecordKeys = _.keys(testListings);
          var testRecords = _.values(testListings);
          return Promise.each(testRecords, (listing, index) => {
            return Listing.insertOne(db, schema, listing).then((listing) => {
              var key = testRecordKeys[index];
              testListings[key] = listing;
            });
          });
        }).finally(() => {
          return db.close();
        });
      });
    });
  })
  it('should fail to authenticate as non-existing user', function() {
    var url = `http://localhost/api/authorization`;
    var badCredentials = _.extend({}, testCredentials, { username: 'no_one' });
    return retrieveData(url, badCredentials).then((resp) => {
      expect(resp).to.have.property('statusCode', 401);
    });
  })
  it('should fail to authenticate when given incorrect password', function() {
    var url = `http://localhost/api/authorization/`;
    var badCredentials = _.extend({}, testCredentials, { password: 'wrong' });
    return retrieveData(url, badCredentials).then((resp) => {
      expect(resp).to.have.property('statusCode', 401);
    });
  })
  it('should obtain an authorization token using the correct login information', function() {
    var url = `http://localhost/api/authorization/`;
    return retrieveData(url, testCredentials).then((resp) => {
      expect(resp.body).to.have.property('user_id');
      expect(resp.body).to.have.property('token');
    });
  })
  it('should be able to retrieve the test user record', function() {
    var url = `http://localhost/api/retrieval/global/user/`;
    var params = { ids: [ testUser.id ] };
    return retrieveProtectedData(url, params, testCredentials).then((resp) => {
      var user = resp.body[0];
      expect(user).to.have.property('id', testUser.id);
      expect(user).to.have.deep.property('details.first_name', testUser.details.first_name);
    });
  })
  it('should fetch the correct listing with only new stories', function() {
    var url = `http://localhost/api/retrieval/${schema}/listing/`;
    var params = { ids: [ testListings.old_0_new_3.id ] };
    return retrieveProtectedData(url, params, testCredentials).then((resp) => {
      var listing = resp.body[0];
      expect(listing).to.have.property('story_ids').that
        .includes(101).and
        .includes(102).and
        .includes(103);
    });
  })
  it('should fetch the correct listing retaining two old stories', function() {
    var url = `http://localhost/api/retrieval/${schema}/listing/`;
    var params = { ids: [ testListings.old_5_new_4.id ] };
    return retrieveProtectedData(url, params, testCredentials).then((resp) => {
      var listing = resp.body[0];
      expect(listing).to.have.property('story_ids').that
        .includes(104).and
        .includes(105).and
        .includes(106).and
        .includes(107).and
        .includes(109);
    });
  })
  it('should fetch the correct listing with half the new stories', function() {
    var url = `http://localhost/api/retrieval/${schema}/listing/`;
    var params = { ids: [ testListings.old_5_new_8.id ] };
    return retrieveProtectedData(url, params, testCredentials).then((resp) => {
      var listing = resp.body[0];
      expect(listing).to.have.property('story_ids').that
        .includes(105).and
        .includes(109).and
        .includes(110).and
        .includes(112).and
        .includes(113);
    });
  })
  it('should update the access time of listing', function() {
    var url = `http://localhost/api/retrieval/${schema}/listing/`;
    var params = { ids: [ testListings.old_5_new_8.id ] };
    var now = (new Date).toISOString();
    return retrieveProtectedData(url, params, testCredentials).delay(1000).then((resp) => {
      return Database.open().then((db) => {
        var criteria = { id: testListings.old_5_new_8.id };
        return Listing.findOne(db, schema, criteria, '*').then((listing) => {
          expect(listing).to.have.property('atime').that.is.above(now);
        });
      });
    });
  })
  it('should finalize other listings belonging to the same user', function() {
    var url = `http://localhost/api/retrieval/${schema}/listing/`;
    var params = { ids: [ testListings.all.id ] };
    var now = (new Date).toISOString();
    return retrieveProtectedData(url, params, testCredentials).delay(1000).then((resp) => {
      return Database.open().then((db) => {
        var criteria = { id: testListings.roleSpecific.id };
        return Listing.findOne(db, schema, criteria, '*').then((listing) => {
          expect(listing).to.have.deep.property('details.candidates').that.is.empty;
        });
      });
    });
  })
  after(function() {
    if (DataServer) {
      return DataServer.stop();
    }
  })
})

function retrieveProtectedData(url, payload, credentials) {
  var authURL = 'http://localhost/api/authorization/'
  return retrieveData(authURL, credentials).then((resp) => {
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
