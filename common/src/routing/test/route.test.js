var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;

var Route = require('routing/route');

describe('Route', () => {
    describe('#match', () => {
        it('should extract parameters from a matching URL', () => {
            var url = '/forum/123/msg/4/';
            var params = Route.match('/forum/:forumId/msg/:msgId/', url);
            expect(params).to.have.property('forumId', '123');
            expect(params).to.have.property('msgId', '4');
        })
        it('should return undefined when the URL does not match', () => {
            var url = '/home';
            var params = Route.match('/forum/:forumId/msg/:msgId/', url);
            expect(params).to.be.undefined;
        })
    })
    describe('#change', () => {
        it('should try to change the URL through RouteManager', () =>{
            var newUrl = '/before/'
            var routeManager = {
                change: function(url) {
                    newUrl = url;
                    return Promise.delay(50);
                },
                getUrl: function(url) { return newUrl },
                getComponent: function() { return null },
                getParameters: function() { return {} },
                getQuery: function() { return {} },
            };
            var url = '/after/';
            var route = new Route(routeManager);
            return route.change(url).then(() => {
                expect(newUrl).to.equal(url);
            })
        })
    })
})
