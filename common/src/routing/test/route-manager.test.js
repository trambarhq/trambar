var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var RouteManager = require('routing/route-manager.jsx');
var Database = require('data/database');

function MockPage(url, params) {
    this.url = url;
    this.parameters = params;
}

MockPage.prototype.parseUrl = function(url) {
    if (url === this.url) {
        return this.parameters;
    }
};

var pages = [
    new MockPage('/home/', {}),
    new MockPage('/settings', {}),
    new MockPage('/forum/1/', { forumId: 1 }),
    new MockPage('/forum/1/messages/2/', { forumId: 1, messageId: 2 }),
];

describe('RouteManager', function() {
    // set the browser location to the base URL
    var startUrl = location.href;
    history.replaceState({}, '', '/test/');

    var changeCount = 0;
    var redirectionCount = 0;
    var database = new Database();
    var managerReady = new Promise((resolve, reject) => {
        var props = {
            pages,
            baseUrls: [ '/test' ],
            database: database,

            onChange: (evt) => {
                if (resolve) {
                    resolve(evt.target);
                    resolve = null; // don't call this again
                }
                changeCount++;
            },
            onRedirectionRequest: (evt) => {
                redirectionCount++;
                return Promise.resolve(pages[0].url);
            },
        };
        var wrapper = Enzyme.mount(<RouteManager {...props} />);

        setTimeout(() => {
            reject(new Error('onChange not called within 1000ms'));
        }, 1000);
    });

    it('should call onChange() at some point', function() {
        return managerReady;
    })
    it('should have detected correctly the base URL', function() {
        return managerReady.then((manager) => {
            expect(manager.state).to.have.property('baseUrl', '/test');
        });
    })
    it('should have call onRedirectionRequest() since no page maps to /', function() {
        return managerReady.then((manager) => {
            expect(redirectionCount).to.be.above(0);
        });
    })
    it('should have redirected to the home page', function() {
        return managerReady.then((manager) => {
            expect(manager.getUrl()).to.equal('/home/');
            expect(location.pathname).to.equal('/test/home/');
        });
    })

    describe('#change()', function() {
        it('should not fire onChange() where called with the current URL', function() {
            return managerReady.then((manager) => {
                var prevChangeCount = changeCount;
                return manager.change(manager.getUrl()).then(() => {
                    expect(changeCount).to.equal(prevChangeCount);
                });
            });
        })
        it('should to able to change to different pages', function() {
            return managerReady.then((manager) => {
                return Promise.each([1, 2, 3], (index) => {
                    var page = pages[index];
                    return manager.change(page.url).then(() => {
                        expect(manager.getUrl()).to.equal(page.url);
                        expect(manager.getParameters()).to.equal(page.parameters);
                    });
                });
            })
        })
    })
})
