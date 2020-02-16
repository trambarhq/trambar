var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;

var Database = require('database');
var SchemaManager = require('schema-manager');

// service being tested
var LiveDataInvalidator = require('live-data-invalidator');

// accessors
var Statistics = require('accessors/statistics');
var Listing = require('accessors/listing');
var Story = require('accessors/story');
var Reaction = require('accessors/reaction');

var schema = 'test:LiveDataInvalidator';

describe('LiveDataInvalidator', function() {
  var testStatistics = {
    rangeOverall: {
      type: 'story-date-range',
      filters: {},
    },
    rangeRoles: {
      type: 'story-date-range',
      filters: {
        role_ids: [ 800, 1000 ]
      }
    },
    rangeUser: {
      type: 'story-date-range',
      filters: {
        user_ids: [ 600 ]
      }
    },
    activitiesOverall: {
      type: 'daily-activities',
      filters: {},
    },
    activitiesRoles: {
      type: 'daily-activities',
      filters: {
        role_ids: [ 800, 1000 ]
      }
    },
    activitiesUser: {
      type: 'daily-activities',
      filters: {
        user_ids: [ 600 ]
      }
    },
    popularity: {
      type: 'story-popularity',
      filters: {
        story_id: 500
      }
    },
  };
  var testListings = {
    newsAll: {
      type: 'news',
      filters: {},
      target_user_id: 235,
    },
    newsRoles: {
      type: 'news',
      filters: {
        role_ids: [ 2 ]
      },
      target_user_id: 235,
    },
    withCandidates: {
      type: 'news',
      details: {
        candidates: [
          {
            id: 101,
            ptime: '2017-06-04T20:02:42.060Z',
            rating: 1,
          }
        ]
      },
      filters: {},
      target_user_id: 235,
    }
  }
  before(function() {
    if (!process.env.DOCKER_MOCHA) {
      return this.skip();
    }
    this.timeout(30000);
    return LiveDataInvalidator.start().then(() => {
      return Database.open().then((db) => {
        // drop test schema if it's there
        return db.schemaExists(schema).then((exists) => {
          if (exists) {
            return SchemaManager.deleteSchema(db, schema);
          }
        }).then(() => {
          return SchemaManager.createSchema(db, schema);
        }).then(() => {
          // create test records
          var testRecordKeys = _.keys(testStatistics);
          var testRecords = _.values(testStatistics);
          return Promise.each(testRecords, (record, index) => {
            // rely on auto-generation
            return Statistics.findOne(db, schema, record, '*').then((stats) => {
              var key = testRecordKeys[index];
              testStatistics[key] = stats;
            });
          }).then(() => {
            // set dirty to false
            return cleanStatistics(db, schema, testStatistics);
          });
        }).then(() => {
          // create test records
          var testRecordKeys = _.keys(testListings);
          var testRecords = _.values(testListings);
          return Promise.each(testRecords, (record, index) => {
            // rely on auto-generation
            return Listing.findOne(db, schema, record, '*').then((listing) => {
              var key = testRecordKeys[index];
              testListings[key] = listing;
            });
          }).then(() => {
            // set dirty to false
            return cleanListings(db, schema, testListings);
          });
        });
      });
    });
  })
  it('should mark stats as dirty when a published story is inserted', function() {
    return Database.open().then((db) => {
      var story = {
        type: 'post',
        user_ids: [ 1 ],
        role_ids: [ 2 ],
        published: true,
        ptime: now(),
      };
      return cleanStatistics(db, schema, testStatistics).then(() => {
        return Story.insertOne(db, schema, story).delay(800);
      }).then((story) => {
        var ids = [
          testStatistics.rangeOverall.id,
          testStatistics.activitiesOverall.id,
        ];
        return Statistics.find(db, schema, { id: ids }, '*').each((stats) => {
          expect(stats).to.have.property('dirty', true);
        });
      });
    });
  }).timeout(5000)
  it('should ignore a story when it is not published', function() {
    return Database.open().then((db) => {
      var story = {
        type: 'post',
        user_ids: [ 1 ],
        role_ids: [ 2 ],
        published: false,
      };
      return cleanStatistics(db, schema, testStatistics).then(() => {
        return Story.insertOne(db, schema, story).delay(800);
      }).then((story) => {
        var ids = [
          testStatistics.rangeOverall.id,
          testStatistics.activitiesOverall.id,
        ];
        return Statistics.find(db, schema, { id: ids }, '*').each((stats) => {
          expect(stats).to.have.property('dirty', false);
        });
      });
    });
    return Story.insertOne()
  }).timeout(5000)
  it('should trigger "clean" events when a published story is inserted', function() {
    // need exclusive connection for event handling
    return Database.open(true).then((db) => {
      var story = {
        type: 'post',
        user_ids: [ 1 ],
        role_ids: [ 2 ],
        published: true,
        ptime: now(),
      };
      var cleaningIds = [];
      var onClean = function(events) {
        _.each(events, (evt) => {
          cleaningIds.push(evt.id);
        });
      };
      return cleanStatistics(db, schema, testStatistics).then(() => {
        return db.listen([ 'statistics' ], 'clean', onClean, 100).then(() => {
          return Story.insertOne(db, schema, story).delay(800).then((story) => {
            expect(cleaningIds).to.include(testStatistics.rangeOverall.id);
            expect(cleaningIds).to.include(testStatistics.activitiesOverall.id);
          });
        });
      }).finally(() => {
        db.close();
      });
    });
    return Story.insertOne()
  }).timeout(5000)
  it('should invalidate user and role specific stats', function() {
    return Database.open().then((db) => {
      var story = {
        type: 'post',
        user_ids: [ 600 ],
        role_ids: [ 800 ],
        published: true,
        ptime: now(),
      };
      return cleanStatistics(db, schema, testStatistics).then(() => {
        return Story.insertOne(db, schema, story).delay(800)
      }).then((story) => {
        var ids = [
          testStatistics.rangeOverall.id,
          testStatistics.rangeRoles.id,
          testStatistics.rangeUser.id,
          testStatistics.activitiesOverall.id,
          testStatistics.activitiesRoles.id,
          testStatistics.activitiesUser.id,
        ];
        return Statistics.find(db, schema, { id: ids }, '*').each((stats) => {
          expect(stats).to.have.property('dirty', true);
        });
      });
    });
    return Story.insertOne()
  }).timeout(5000)
  it('should invalidate story popularity stats when there is a new reaction to it', function() {
    return Database.open().then((db) => {
      var reaction = {
        type: 'like',
        story_id: 500,
        user_id: 3,
        published: true,
      };
      return cleanStatistics(db, schema, testStatistics).then(() => {
        return Reaction.insertOne(db, schema, reaction).delay(800);
      }).then((reaction) => {
        var ids = [
          testStatistics.popularity.id,
        ];
        return Statistics.find(db, schema, { id: ids }, '*').each((stats) => {
          expect(stats).to.have.property('dirty', true);
        });
      });
    });
    return Story.insertOne()
  }).timeout(5000)
  it('should ignore a change to a reaction that would not affect the stats', function() {
    return Database.open().then((db) => {
      var reaction = {
        type: 'like',
        story_id: 500,
        user_id: 3,
        published: true,
      };
      return cleanStatistics(db, schema, testStatistics).then(() => {
        return Reaction.insertOne(db, schema, reaction).delay(800);
      }).then((reaction) => {
        return cleanStatistics(db, schema, testStatistics).then(() => {
          reaction.details = { text: 'something' };
          return Reaction.saveOne(db, schema, reaction).delay(800).then((reaction) => {
            var ids = [
              testStatistics.popularity.id,
            ];
            return Statistics.find(db, schema, { id: ids }, '*').each((stats) => {
              expect(stats).to.have.property('dirty', false);
            });
          });
        });
      });
    });
    return Story.insertOne()
  }).timeout(5000)
  it('should mark listing as dirty when a published story is inserted', function() {
    return Database.open().then((db) => {
      var story = {
        type: 'post',
        user_ids: [ 1 ],
        role_ids: [ 2 ],
        published: true,
        ptime: now(),
      };
      return cleanListings(db, schema, testStatistics).then(() => {
        return Story.insertOne(db, schema, story).delay(800);
      }).then((story) => {
        var ids = [
          testListings.newsAll.id,
        ];
        return Listing.find(db, schema, { id: ids }, '*').each((listing) => {
          expect(listing).to.have.property('dirty', true);
        });
      }).finally(() => {
        return cleanListings(db, schema, testStatistics);
      });
    });
  }).timeout(5000)
  it('should invalidate a listing when a story satisfies filters', function() {
    return Database.open().then((db) => {
      var story = {
        type: 'post',
        user_ids: [ 1 ],
        role_ids: [ 2 ],
        published: true,
        ptime: now(),
      };
      return cleanListings(db, schema, testStatistics).then(() => {
        return Story.insertOne(db, schema, story).delay(800);
      }).then((story) => {
        var ids = [
          testListings.newsRoles.id,
        ];
        return Listing.find(db, schema, { id: ids }, '*').each((listing) => {
          expect(listing).to.have.property('dirty', false);
        });
      });
    });
  }).timeout(5000)
  it('should not invalidate a listing when a story does not satisfy filters', function() {
    return Database.open().then((db) => {
      var story = {
        type: 'post',
        user_ids: [ 1 ],
        role_ids: [ 1 ],
        published: true,
        ptime: now(),
      };
      return cleanListings(db, schema, testStatistics).then(() => {
        return Story.insertOne(db, schema, story).delay(800);
      }).then((story) => {
        var ids = [
          testListings.newsRoles.id,
        ];
        return Listing.find(db, schema, { id: ids }, '*').each((listing) => {
          expect(listing).to.have.property('dirty', false);
        });
      });
    });
  }).timeout(5000)
  it('should invalidate a listing when a story popularity changes', function() {
    return Database.open().then((db) => {
      var statistics = {
        type: 'story-popularity',
        filters: { story_id: 101 }
      };
      return Statistics.findOne(db, schema, statistics, '*').then((stats) => {
        return cleanListings(db, schema, testStatistics);
      }).then(() => {
        var details = { like: 1 };
        return Statistics.updateOne(db, schema, { details }, '*');
      }).then((stats) => {
        var ids = [
          testListings.withCandidates.id,
        ];
        return Listing.find(db, schema, { id: ids }, '*').each((listing) => {
          expect(listing).to.have.property('dirty', false);
        });
      });
    });
  }).timeout(5000)
  after(function() {
    if (LiveDataInvalidator) {
      return LiveDataInvalidator.stop();
    }
  })
})

function cleanStatistics(db, schema, records) {
  var ids = _.map(records, 'id');
  return Statistics.find(db, schema, { id: ids }, '*').map((stats) => {
    if (stats.dirty) {
      return Statistics.lock(db, schema, stats.id, '5 seconds', '*').then((stats) => {
        var details = {};
        return Statistics.unlock(db, schema, stats.id, { details }, '*');
      });
    } else {
      return stats;
    }
  });
}

function cleanListings(db, schema, records) {
  var ids = _.map(records, 'id');
  return Listing.find(db, schema, { id: ids }, '*').map((listing) => {
    if (listing.dirty) {
      return Listing.lock(db, schema, listing.id, '5 seconds', '*').then((listing) => {
        var details = {};
        return Listing.unlock(db, schema, listing.id, { details }, '*');
      });
    } else {
      return listing;
    }
  });
}

function now() {
  return (new Date).toISOString();
}
