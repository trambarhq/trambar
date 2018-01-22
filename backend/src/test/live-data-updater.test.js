var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;

var Database = require('database');
var SchemaManager = require('schema-manager');

// service being tested
var LiveDataUpdater = require('live-data-updater');

// accessors
var Listing = require('accessors/listing');
var Statistics = require('accessors/statistics');
var Story = require('accessors/story');
var Reaction = require('accessors/reaction');

var schema = 'test:LiveDataUpdater';

describe('LiveDataUpdater', function() {
    var testStories = [
        {
            type: 'post',
            user_ids: [ 1 ],
            role_ids: [ 1 ],
            published: true,
            ptime: '2016-01-01T00:00:00.000Z',
        },
        {
            type: 'post',
            user_ids: [ 1 ],
            role_ids: [ 1 ],
            published: true,
            ptime: '2016-05-01T00:00:00.000Z',
        },
        {
            type: 'post',
            user_ids: [ 2 ],
            role_ids: [ 2 ],
            published: true,
            ptime: '2017-05-01T00:00:00.000Z',
        },
    ];
    var testReactions = [
        {
            type: 'like',
            story_id: 999,
            user_id: 1,
            published: true,
            ptime: '2017-05-01T00:00:00.000Z',
        },
        {
            type: 'comment',
            story_id: 999,
            user_id: 1,
            published: true,
            ptime: '2017-05-02T00:00:00.000Z',
        }
    ];
    before(function() {
        if (!process.env.DOCKER_MOCHA) {
            return this.skip();
        }
        this.timeout(30000);
        return LiveDataUpdater.start().then(() => {
            return Database.open(true).then((db) => {
                // drop test schema if it's there
                return db.schemaExists(schema).then((exists) => {
                    if (exists) {
                        return SchemaManager.deleteSchema(db, schema);
                    }
                }).then(() => {
                    return SchemaManager.createSchema(db, schema);
                }).then(() => {
                    // create test stories
                    return Story.insert(db, schema, testStories).then((stories) => {
                        testStories = stories;
                    });
                }).then(() => {
                    // create test reactions
                    return Reaction.insert(db, schema, testReactions).then((reactions) => {
                        testReactions = reactions;
                    });
                }).finally(() => {
                    return db.close();
                });
            });
        });
    })
    it('should correctly generate a project-range statistics object', function() {
        var stats = {
            type: 'story-date-range',
            filters: {},
        };
        return Database.open().then((db) => {
            return Statistics.findOne(db, schema, stats, 'id').then((stats) => {
                return Statistics.invalidate(db, schema, [ stats.id ]).delay(800).then(() => {
                    // fetch the record again, after giving the updater some time to update it
                    return Statistics.findOne(db, schema, { id: stats.id }, '*').then((stats) => {
                        var relevantStories = testStories;
                        var correctStartTime = _.min(_.map(relevantStories, 'ptime'));
                        var correctEndTime = _.max(_.map(relevantStories, 'ptime'));
                        expect(stats).to.have.deep.property('details.start_time', correctStartTime);
                        expect(stats).to.have.deep.property('details.end_time', correctEndTime);
                    });
                });
            });
        });
    }).timeout(5000);
    it('should correctly generate a user-specific project-range statistics object', function() {
        var stats = {
            type: 'story-date-range',
            filters: {
                user_ids: [ 1 ]
            },
        };
        return Database.open().then((db) => {
            return Statistics.findOne(db, schema, stats, 'id').then((stats) => {
                return Statistics.invalidate(db, schema, [ stats.id ]).delay(800).then(() => {
                    // fetch the record again, after giving the updater some time to update it
                    return Statistics.findOne(db, schema, { id: stats.id }, '*').then((stats) => {
                        var relevantStories = _.filter(testStories, (story) => {
                            return _.includes(story.user_ids, 1);
                        });
                        var correctStartTime = _.min(_.map(relevantStories, 'ptime'));
                        var correctEndTime = _.max(_.map(relevantStories, 'ptime'));
                        expect(stats).to.have.deep.property('details.start_time', correctStartTime);
                        expect(stats).to.have.deep.property('details.end_time', correctEndTime);
                    });
                });
            });
        });
    }).timeout(5000);
    it('should correctly generate a role-specific project-range statistics object', function() {
        var stats = {
            type: 'story-date-range',
            filters: {
                role_ids: [ 1 ]
            },
        };
        return Database.open().then((db) => {
            return Statistics.findOne(db, schema, stats, 'id').then((stats) => {
                return Statistics.invalidate(db, schema, [ stats.id ]).delay(800).then(() => {
                    // fetch the record again, after giving the updater some time to update it
                    return Statistics.findOne(db, schema, { id: stats.id }, '*').then((stats) => {
                        var relevantStories = _.filter(testStories, (story) => {
                            return _.includes(story.role_ids, 1);
                        });
                        var correctStartTime = _.min(_.map(relevantStories, 'ptime'));
                        var correctEndTime = _.max(_.map(relevantStories, 'ptime'));
                        expect(stats).to.have.deep.property('details.start_time', correctStartTime);
                        expect(stats).to.have.deep.property('details.end_time', correctEndTime);
                    });
                });
            });
        });
    }).timeout(5000);
    it('should correctly generate a daily-activities statistics object', function() {
        var stats = {
            type: 'daily-activities',
            filters: {
                time_range: '[2016-01-01T00:00:00.000Z,2016-02-01T00:00:00.000Z]'
            },
        };
        return Database.open().then((db) => {
            return Statistics.findOne(db, schema, stats, 'id').then((stats) => {
                return Statistics.invalidate(db, schema, [ stats.id ]).delay(800).then(() => {
                    // fetch the record again, after giving the updater some time to update it
                    return Statistics.findOne(db, schema, { id: stats.id }, '*').then((stats) => {
                        expect(stats).to.have.deep.property('details.2016-01-01.story').that.is.above(0);
                    });
                });
            });
        });
    }).timeout(5000);
    it('should correctly generate a story-popularity statistics object', function() {
        var stats = {
            type: 'story-popularity',
            filters: {
                story_id: 999
            },
        };
        return Database.open().then((db) => {
            return Statistics.findOne(db, schema, stats, 'id').then((stats) => {
                return Statistics.invalidate(db, schema, [ stats.id ]).delay(800).then(() => {
                    // fetch the record again, after giving the updater some time to update it
                    return Statistics.findOne(db, schema, { id: stats.id }, '*').then((stats) => {
                        expect(stats).to.have.deep.property('details.like').that.is.above(0);
                        expect(stats).to.have.deep.property('details.comment').that.is.above(0);
                    });
                });
            });
        });
    }).timeout(5000);
    it('should correctly generate a news listing object', function() {
        var listing = {
            type: 'news',
            filters: {},
            target_user_id: 235,
        };
        return Database.open().then((db) => {
            return Listing.findOne(db, schema, listing, 'id').then((listing) => {
                return Listing.invalidate(db, schema, [ listing.id ]).delay(800).then(() => {
                    // fetch the record again, after giving the updater some time to update it
                    return Listing.findOne(db, schema, { id: listing.id }, '*').then((listing) => {
                        expect(listing).to.have.deep.property('details.candidates.length').that.is.above(0);
                    });
                });
            });
        });
    }).timeout(5000);
    it('should correctly generate a role-specific news listing object', function() {
        var listing = {
            type: 'news',
            filters: {
                role_ids: [ 2 ]
            },
            target_user_id: 235,
        };
        return Database.open().then((db) => {
            return Listing.findOne(db, schema, listing, 'id').then((listing) => {
                return Listing.invalidate(db, schema, [ listing.id ]).delay(800).then(() => {
                    // fetch the record again, after giving the updater some time to update it
                    return Listing.findOne(db, schema, { id: listing.id }, '*').then((listing) => {
                        expect(listing).to.have.deep.property('details.candidates.length', 1);
                    });
                });
            });
        });
    }).timeout(5000);
    after(function() {
        if (LiveDataUpdater) {
            return LiveDataUpdater.stop();
        }
    })
})
