var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;

var Route = require('routing/route');

describe('Route', function() {
    describe('#match', function() {
        it('should extract parameters from a matching URL', function() {
            var url = '/forum/123/msg/4/';
            var params = Route.match(url, [ '/forum/:forumId/msg/:msgId/' ], (params) => {
                return params;
            });
            expect(params).to.have.property('forumId', '123');
            expect(params).to.have.property('msgId', '4');
        })
        it('should return undefined when the URL does not match', function() {
            var url = '/home';
            var params = Route.match(url, [ '/forum/:forumId/msg/:msgId/' ], (params) => {
                return params;
            });
            expect(params).to.be.undefined;
        })
    })
    describe('#change', function() {
        it('should try to change the URL through RouteManager', function() {
            var newURL = '/before/'
            var routeManager = {
                change: function(url) {
                    newURL = url;
                    return Promise.delay(50);
                },
                getURL: function(url) { return newURL },
                getComponent: function() { return null },
                getParameters: function() { return {} },
                getQuery: function() { return {} },
                getHash: function() { return '' },
            };
            var url = '/after/';
            var route = new Route(routeManager);
            return route.change(url).then(() => {
                expect(newURL).to.equal(url);
            })
        })
    })
})
