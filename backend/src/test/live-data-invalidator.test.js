var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;

var Database = require('database');
var SchemaManager = require('schema-manager');

// service being tested
var LiveDataInvalidator = require('live-data-invalidator');

// accessors
var Statistics = require('accessors/statistics');
var Story = require('accessors/story');
var Reaction = require('accessors/reaction');

var schema = 'test:LiveDataInvalidator';

describe('LiveDataInvalidator', function() {
    var testStatsRecords = {
        rangeOverall: {
            type: 'project-date-range',
            filters: {},
        },
        rangeRoles: {
            type: 'project-date-range',
            filters: {
                role_ids: [ 800, 1000 ]
            }
        },
        rangeUser: {
            type: 'project-date-range',
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
    before(function() {
        if (!process.env.DOCKER_MOCHA) {
            return this.skip();
        }
        this.timeout(30000);
        return LiveDataInvalidator.start().then(() => {
            return Database.open().then((db) => {
                // create test schema if it's not there
                return db.schemaExists(schema).then((exists) => {
                    if (!exists) {
                        return SchemaManager.createSchema(db, schema);
                    }
                }).then(() => {
                    // create test records
                    var testRecordKeys = _.keys(testStatsRecords);
                    var testRecords = _.values(testStatsRecords);
                    return Promise.each(testRecords, (record, index) => {
                        // rely on auto-generation
                        return Statistics.findOne(db, schema, record, '*').then((stats) => {
                            var key = testRecordKeys[index];
                            testStatsRecords[key] = stats;
                        });
                    }).then(() => {
                        // set dirty to false
                        return cleanRecords(db, schema, testStatsRecords);
                    });
                });
            });
        });
    })
    it('should mark stats as dirty when a published story is inserted', function() {
        return Database.open().then((db) => {
            var story = {
                type: 'story',
                user_ids: [ 1 ],
                role_ids: [ 2 ],
                published: true,
                ptime: now(),
            };
            return Story.insertOne(db, schema, story).delay(500).then((story) => {
                var ids = [
                    testStatsRecords.rangeOverall.id,
                    testStatsRecords.activitiesOverall.id,
                ];
                return Statistics.find(db, schema, { id: ids }, '*').each((stats) => {
                    expect(stats).to.have.property('dirty', true);
                });
            }).finally(() => {
                return cleanRecords(db, schema, testStatsRecords);
            });
        });
    }).timeout(5000)
    it('should ignore a story when it is not published', function() {
        return Database.open().then((db) => {
            var story = {
                type: 'story',
                user_ids: [ 1 ],
                role_ids: [ 2 ],
                published: false,
            };
            return Story.insertOne(db, schema, story).delay(500).then((story) => {
                var ids = [
                    testStatsRecords.rangeOverall.id,
                    testStatsRecords.activitiesOverall.id,
                ];
                return Statistics.find(db, schema, { id: ids }, '*').each((stats) => {
                    expect(stats).to.have.property('dirty', false);
                });
            }).finally(() => {
                return cleanRecords(db, schema, testStatsRecords);
            });
        });
        return Story.insertOne()
    }).timeout(5000)
    it('should trigger "clean" events when a published story is inserted', function() {
        // need exclusive connection for event handling
        return Database.open(true).then((db) => {
            var story = {
                type: 'story',
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
            return db.listen([ 'statistics' ], 'clean', onClean, 100).then(() => {
                return Story.insertOne(db, schema, story).delay(500).then((story) => {
                    expect(cleaningIds).to.include(testStatsRecords.rangeOverall.id);
                    expect(cleaningIds).to.include(testStatsRecords.activitiesOverall.id);
                });
            }).finally(() => {
                return cleanRecords(db, schema, testStatsRecords).then(() => {
                    db.close();
                });
            });
        });
        return Story.insertOne()
    }).timeout(5000)
    it('should invalidate user and role specific stats', function() {
        return Database.open().then((db) => {
            var story = {
                type: 'story',
                user_ids: [ 600 ],
                role_ids: [ 800 ],
                published: true,
                ptime: now(),
            };
            return Story.insertOne(db, schema, story).delay(500).then((story) => {
                var ids = [
                    testStatsRecords.rangeOverall.id,
                    testStatsRecords.rangeRoles.id,
                    testStatsRecords.rangeUser.id,
                    testStatsRecords.activitiesOverall.id,
                    testStatsRecords.activitiesRoles.id,
                    testStatsRecords.activitiesUser.id,
                ];
                return Statistics.find(db, schema, { id: ids }, '*').each((stats) => {
                    expect(stats).to.have.property('dirty', true);
                });
            }).finally(() => {
                return cleanRecords(db, schema, testStatsRecords);
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
                target_user_id: 1,
                published: true,
            };
            return Reaction.insertOne(db, schema, reaction).delay(500).then((reaction) => {
                var ids = [
                    testStatsRecords.popularity.id,
                ];
                return Statistics.find(db, schema, { id: ids }, '*').each((stats) => {
                    expect(stats).to.have.property('dirty', true);
                });
            }).finally(() => {
                return cleanRecords(db, schema, testStatsRecords);
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
                target_user_id: 1,
                published: true,
            };
            return Reaction.insertOne(db, schema, reaction).delay(500).then((reaction) => {
                return cleanRecords(db, schema, testStatsRecords).then(() => {
                    reaction.details = { text: 'something' };
                    return Reaction.saveOne(db, schema, reaction).delay(500).then((reaction) => {
                        var ids = [
                            testStatsRecords.popularity.id,
                        ];
                        return Statistics.find(db, schema, { id: ids }, '*').each((stats) => {
                            expect(stats).to.have.property('dirty', false);
                        });
                    });
                });
            }).finally(() => {
                return cleanRecords(db, schema, testStatsRecords);
            });
        });
        return Story.insertOne()
    }).timeout(5000)
    after(function() {
        if (LiveDataInvalidator) {
            return LiveDataInvalidator.stop();
        }
    })
})

function cleanRecords(db, schema, records) {
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

function now() {
    return (new Date).toISOString();
}
