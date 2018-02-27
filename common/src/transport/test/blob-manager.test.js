var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;

var BlobManager = require('transport/blob-manager');
var CordovaFile = require('utils/cordova-file');
var HTTPRequest = require('transport/http-request');

describe('BlobManager', function() {
    var fetchOriginal = HTTPRequest.fetch;
    after (function() {
        HTTPRequest.fetch = fetchOriginal;
    })

    describe('#manage()', function() {
        it('should accept a blob and return its URL', function() {
            var blob = new Blob([ 'Hello' ]);
            var url = BlobManager.manage(blob);
            return expect(url).to.match(/^blob:/);
        })
        if (process.env.PLATFORM === 'cordova') {
            it('should accept a Cordova file object', function() {
                var file = new CordovaFile('/home/bob/nice.jpg', 'image/jpeg');
                var url = BlobManager.manage(file);
                return expect(url).to.equal(file.fullPath);
            })
        }
    })
    describe('#find()'), function() {
        it('should find a blob by its URL', function() {
            var blob = new Blob([ 'Hello' ]);
            var url1 = BlobManager.manage(blob);
            var url2 = BlobManager.find(url1);
            return expect(url1).to.equal(url2);
        })
        it('should return null when given an unknown URL', function() {
            var url = BlobManager.find('http://does.not.exists');
            return expect(url).to.be.null;
        })
    })
    describe('#associate()'), function() {
        it('should associate a blob with an external URL', function() {
            var blob = new Blob([ 'Hello' ]);
            var url1 = BlobManager.manage(blob);
            var remoteURL = 'http://somewhere.out.there';
            BlobManager.associate(blob, remoteURL);
            var url2 = BlobManager.find(remoteURL);
            return expect(url2).to.equal(url1);
        })
    })
    describe('#get()'), function() {
        it('should return a blob given its URL', function() {
            var blob1 = new Blob([ 'Hello' ]);
            var url = BlobManager.manage(blob1);
            var blob2 = BlobManager.get(url);
            return expect(blob2).to.equal(blob1);
        })
    })
    describe('#fetch()'), function() {
        it('should fetch a blob over HTTP', function() {
            var blob1 = new Blob([ 'Hello' ]);
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.resolve(blob1);
            };
            return BlobManager.fetch('http://blobhub.net/123').then((localURL) => {
                expect(localURL).to.match(/^blob:/);
                var blob2 = BlobManager.get(localURL);
                expect(blob2).to.equal(blob1);
            });
        })
        it('should not repeat a file transfer', function() {
            var blob1 = new Blob([ 'Hello' ]);
            var count = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                count++;
                return Promise.resolve(blob1);
            };
            return BlobManager.fetch('http://blobhub.net/567').then((localURL) => {
                return BlobManager.fetch('http://blobhub.net/567').then((localURL) => {
                    var blob2 = BlobManager.get(localURL);
                    expect(blob2).to.equal(blob1);
                    expect(count).to.equal(1);
                });
            });
        })
    })
    describe('#remove()'), function() {
        it('should remove a loaded blob', function() {
            var blob1 = new Blob([ 'Hello' ]);
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.resolve(blob1);
            };
            return BlobManager.fetch('http://blobhub.net/bad').then((localURL) => {
                BlobManager.remove(localURL);
                var blob2 = BlobManager.get(localURL);
                expect(blob2).to.be.null;
            });
        })
    })
})
