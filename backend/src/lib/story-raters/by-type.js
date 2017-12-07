var _ = require('lodash');
var Promise = require('bluebird');

var storyRatings = {
    'push': 20,
    'merge': 50,
    'branch': 0,
    'issue': 30,
    'milestone': 0,
    'wiki': 0,
    'member': 0,
    'repo': 0,
    'story': 10,
    'survey': 30,
    'task-list': 20,
};

module.exports = {
    name: 'by-type',
    columns: [ 'type' ],
    monitoring: [],

    prepareContext: function(db, schema, stories, listing) {
        return Promise.resolve({});
    },

    calculateRating: function(context, story) {
        var rating = storyRatings[story.type] || 0;
        return rating;
    },

    handleEvent: function(evt) {
    },
};
