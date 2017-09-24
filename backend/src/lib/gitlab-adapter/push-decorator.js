var _ = require('lodash');
var Promsie = require('bluebird');
var Request = require('request');
var Async = require('utils/async-do-while');

function PushImpact(push) {
    this.push = push;
    this.components = [];
}

PushImpact.prototype.fetch = function(server, repo) {
    // TODO
    return Promise.resolve();
};
