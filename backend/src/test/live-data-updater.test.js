var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;

var Database = require('database');
var SchemaManager = require('schema-manager');

// service being tested
var LiveDataUpdater = require('live-data-updater');

// accessors
var Statistics = require('accessors/statistics');
var Story = require('accessors/story');
var Reaction = require('accessors/reaction');

var schema = 'test:LiveDataUpdater';

describe('LiveDataUpdater', function() {
    var testStories = [
        {
            type: 'story',
            user_ids: [ 899 ],
            role_ids: [ 699 ],
            published: true,
            ptime: now(),
        },
        {
            type: 'story',
            user_ids: [ 899 ],
            role_ids: [ 699 ],
            published: true,
            ptime: now(),
        },

    ]
    before(function() {
        if (!process.env.DOCKER_MOCHA) {
            return this.skip();
        }
        this.timeout(30000);
        return LiveDataUpdater.start().then(() {
            return Database.open(true).then((db) => {
                // create test schema if it's not there
                return db.schemaExists(schema).then((exists) => {
                    if (!exists) {
                        return SchemaManager.createSchema(schema);
                    }
                }).then(() => {
                }).finally(() => {
                    return db.close();
                });
            });
        });
    })
    after(function() {
        if (LiveDataUpdater) {
            return LiveDataUpdater.stop();
        }
    })
})
