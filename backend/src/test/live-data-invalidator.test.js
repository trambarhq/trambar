var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;

var Database = require('database');
var Statistics = require('accessors/statistics');
var Story = require('accessors/story');
var Reaction = require('accessors/reaction');

describe('LiveDataInvalidator', function() {
    var LiveDataInvalidator;
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
        if (process.env.DOCKER_MOCHA) {
            // wait for the creation of the global and test schema
            this.timeout(30000);
            return Database.need([ 'global', 'test' ], 30000).then(() => {
                LiveDataInvalidator = require('live-data-invalidator');
                return LiveDataInvalidator.initialized;
            }).then(() => {
                // create test records
                return Database.open().then((db) => {
                    var testRecordKeys = _.keys(testStatsRecords);
                    var testRecords = _.values(testStatsRecords);
                    return Promise.each(testRecords, (record, index) => {
                        return Statistics.findOne(db, 'test', record, '*').then((stats) => {
                            var key = testRecordKeys[index];
                            testStatsRecords[key] = stats;
                        });
                    }).then(() => {
                        return cleanRecords(db, 'test', testStatsRecords);
                    });
                }).catch((err) => {
                    console.error(err);
                });
            });
        } else {
            this.skip()
        }
    })
    it('should mark stats as dirty when a published story is inserted', () => {
        return Database.open().then((db) => {
            var story = {
                type: 'story',
                user_ids: [ 1 ],
                role_ids: [ 2 ],
                published: true,
                ptime: now(),
            };
            return Story.insertOne(db, 'test', story).delay(500).then((story) => {
                var ids = [
                    testStatsRecords.rangeOverall.id,
                    testStatsRecords.activitiesOverall.id,
                ];
                return Statistics.find(db, 'test', { id: ids }, '*').each((stats) => {
                    expect(stats).to.have.property('dirty', true);
                });
            }).finally(() => {
                return cleanRecords(db, 'test', testStatsRecords);
            });
        });
        return Story.insertOne()
    }).timeout(5000)
    it('should ignore a story when it is not published', () => {
        return Database.open().then((db) => {
            var story = {
                type: 'story',
                user_ids: [ 1 ],
                role_ids: [ 2 ],
                published: false,
            };
            return Story.insertOne(db, 'test', story).delay(500).then((story) => {
                var ids = [
                    testStatsRecords.rangeOverall.id,
                    testStatsRecords.activitiesOverall.id,
                ];
                return Statistics.find(db, 'test', { id: ids }, '*').each((stats) => {
                    expect(stats).to.have.property('dirty', false);
                });
            }).finally(() => {
                return cleanRecords(db, 'test', testStatsRecords);
            });
        });
        return Story.insertOne()
    }).timeout(5000)
    it('should trigger "clean" events when a published story is inserted', () => {
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
                return Story.insertOne(db, 'test', story).delay(500).then((story) => {
                    expect(cleaningIds).to.include(testStatsRecords.rangeOverall.id);
                    expect(cleaningIds).to.include(testStatsRecords.activitiesOverall.id);
                });
            }).finally(() => {
                return cleanRecords(db, 'test', testStatsRecords).then(() => {
                    db.close();
                });
            });
        });
        return Story.insertOne()
    }).timeout(5000)
    it('should invalidate user and role specific stats', () => {
        return Database.open().then((db) => {
            var story = {
                type: 'story',
                user_ids: [ 600 ],
                role_ids: [ 800 ],
                published: true,
                ptime: now(),
            };
            return Story.insertOne(db, 'test', story).delay(500).then((story) => {
                var ids = [
                    testStatsRecords.rangeOverall.id,
                    testStatsRecords.rangeRoles.id,
                    testStatsRecords.rangeUser.id,
                    testStatsRecords.activitiesOverall.id,
                    testStatsRecords.activitiesRoles.id,
                    testStatsRecords.activitiesUser.id,
                ];
                return Statistics.find(db, 'test', { id: ids }, '*').each((stats) => {
                    expect(stats).to.have.property('dirty', true);
                });
            }).finally(() => {
                return cleanRecords(db, 'test', testStatsRecords);
            });
        });
        return Story.insertOne()
    }).timeout(5000)
    it('should invalidate story popularity stats when there is a new reaction to it', () => {
        return Database.open().then((db) => {
            var reaction = {
                type: 'like',
                story_id: 500,
                user_id: 3,
                target_user_id: 1,
                published: true,
            };
            return Reaction.insertOne(db, 'test', reaction).delay(500).then((reaction) => {
                var ids = [
                    testStatsRecords.popularity.id,
                ];
                return Statistics.find(db, 'test', { id: ids }, '*').each((stats) => {
                    expect(stats).to.have.property('dirty', true);
                });
            }).finally(() => {
                return cleanRecords(db, 'test', testStatsRecords);
            });
        });
        return Story.insertOne()
    }).timeout(5000)

    it('should ignore a change to a reaction that would not affect the stats', () => {
        return Database.open().then((db) => {
            var reaction = {
                type: 'like',
                story_id: 500,
                user_id: 3,
                target_user_id: 1,
                published: true,
            };
            return Reaction.insertOne(db, 'test', reaction).delay(500).then((reaction) => {
                return cleanRecords(db, 'test', testStatsRecords).then(() => {
                    reaction.details = { text: 'something' };
                    return Reaction.saveOne(db, 'test', reaction).delay(500).then((reaction) => {
                        var ids = [
                            testStatsRecords.popularity.id,
                        ];
                        return Statistics.find(db, 'test', { id: ids }, '*').each((stats) => {
                            expect(stats).to.have.property('dirty', false);
                        });
                    });
                });
            }).finally(() => {
                return cleanRecords(db, 'test', testStatsRecords);
            });
        });
        return Story.insertOne()
    }).timeout(5000)

    after(function() {
        if (LiveDataInvalidator) {
            return LiveDataInvalidator.exit();
        }
    })
})

function cleanRecords(db, schema, records) {
    var ids = _.map(records, 'id');
    return Statistics.find(db, 'test', { id: ids }, '*').map((stats) => {
        if (stats.dirty) {
            return Statistics.lock(db, 'test', stats.id, '5 seconds', '*').then((stats) => {
                var details = {};
                return Statistics.unlock(db, 'test', stats.id, { details }, '*');
            });
        } else {
            return stats;
        }
    });
}

function now() {
    return (new Date).toISOString();
}
