var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;

var BlobStream = require('transport/blob-stream');
var HTTPRequest = require('transport/http-request');
var HTTPError = require('errors/http-error');

describe('BlobStream', function() {
    var fetchOriginal = HTTPRequest.fetch;
    after (function() {
        HTTPRequest.fetch = fetchOriginal;
    })

    describe('#pull()', function() {
        it('should take a blob that was pushed in previously', function() {
            var stream = new BlobStream('http://somewhere/1', {});
            var blob = new Blob([ 'Hello' ]);
            stream.push(blob);
            return stream.pull().then((b) => {
                return expect(b).to.equal(blob);
            });
        })
        it('should wait when stream is empty', function() {
            var stream = new BlobStream('http://somewhere/2', {});
            var promise1 = stream.pull();
            var promise2 = Promise.delay(250).return('timeout');
            return Promise.race([ promise1, promise2 ]).then((result) => {
                return expect(result).to.equal('timeout');
            });
        })
    })
    describe('#push', function() {
        it('should cause an earlier call to pull() to resolve', function() {
            var stream = new BlobStream('http://somewhere/3', {});
            var promise1 = stream.pull();
            var promise2 = Promise.delay(1000).return('timeout');
            var blob = new Blob([ 'Hello' ]);
            setTimeout(() => {
                stream.push(blob);
            }, 100);
            return Promise.race([ promise1, promise2 ]).then((result) => {
                return expect(result).to.equal(blob);
            });
        })
    })
    describe('#close', function() {
        it('should cause an earlier call to pull() to resolve to null', function() {
            var stream = new BlobStream('http://somewhere/4', {});
            var promise1 = stream.pull();
            var promise2 = Promise.delay(1000).return('timeout');
            setTimeout(() => {
                stream.close();
            }, 100);
            return Promise.race([ promise1, promise2 ]).then((result) => {
                return expect(result).to.be.null;
            });
        })
    })
    describe('#wait', function() {
        it('should wait til all blobs to be finalized', function() {
            var stream = new BlobStream('http://somewhere/5', {});
            _.each(_.range(1, 5), (num) => {
                var blob = new Blob([ `Blob #${num}` ]);
                stream.push(blob);
            });
            stream.close();
            var count = 0;
            var interval = setInterval(() => {
                stream.pull().then((blob) => {
                    count++;
                    if (blob) {
                        stream.finalize(blob);
                    } else {
                        clearInterval(interval);
                    }
                });
            }, 50);
            return stream.wait().then(() => {
                expect(count).to.equal(4);
            });
        })
        it('should reject when the stream was abandoned', function() {
            var stream = new BlobStream('http://somewhere/6', {});
            _.each(_.range(1, 5), (num) => {
                var blob = new Blob([ `Blob #${num}` ]);
                stream.push(blob);
            });
            stream.close();
            var count = 0;
            var interval = setInterval(() => {
                stream.pull().then((blob) => {
                    count++;
                    if (blob) {
                        stream.finalize(blob);
                    } else {
                        clearInterval(interval);
                    }
                    if (count === 2) {
                        stream.abandon(new Error('Interrupted'));
                        clearInterval(interval);
                    }
                });
            }, 50);
            return stream.wait().catch((err) => {
                return 'error'
            }).then((result) => {
                expect(result).to.equal('error');
            });
        })
    })
    describe('#start', function() {
        it('should send chunks to remote server, one at a time', function() {
            this.timeout(5000);

            var stream = new BlobStream('http://somewhere/7', {});
            _.each(_.range(1, 51), (num) => {
                var blob = new Blob([ `Blob #${num}` ]);
                stream.push(blob);
            });
            stream.close();

            var sent = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                var onUploadProgress = options.onUploadProgress;
                return Promise.delay(20).then(() => {
                    sent++;
                    onUploadProgress({
                        type: 'progress',
                        target: {},
                        loaded: 20,
                        total: 20,
                    });
                    return {};
                });
            };

            stream.start();
            return stream.wait().then((result) => {
                var all = stream.toBlob();
                expect(sent).to.equal(50);
                expect(stream.transferred).to.equal(all.size);
            });
        })
        it('should reattempt a chunk when an error occurs', function() {
            this.timeout(30000);

            var stream = new BlobStream('http://somewhere/7', {});
            _.each(_.range(1, 51), (num) => {
                var blob = new Blob([ `Blob #${num}` ]);
                stream.push(blob);
            });
            stream.close();

            var sent = 0;
            var errors = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                var onUploadProgress = options.onUploadProgress;
                return Promise.delay(20).then(() => {
                    if (Math.random() > 0.90) {
                        if (errors < 2) {
                            errors++;
                            throw new HTTPError(504);
                        }
                    }
                    sent++;
                    onUploadProgress({
                        type: 'progress',
                        target: {},
                        loaded: 20,
                        total: 20,
                    });
                    return {};
                });
            };

            stream.start();
            return stream.wait().then((result) => {
                expect(sent).to.equal(50);
                expect(errors).to.be.above(0);
            });
        })
        it('should wait for resumption when suspected', function() {
            this.timeout(5000);

            var stream = new BlobStream('http://somewhere/8', {});
            _.each(_.range(1, 51), (num) => {
                var blob = new Blob([ `Blob #${num}` ]);
                stream.push(blob);
            });
            stream.close();
            stream.suspend();

            var sent = 0;
            var online = false;
            HTTPRequest.fetch = (method, url, payload, options) => {
                var onUploadProgress = options.onUploadProgress;
                return Promise.delay(20).then(() => {
                    if (!online) {
                        throw new HTTPError(504);
                    }
                    sent++;
                    onUploadProgress({
                        type: 'progress',
                        target: {},
                        loaded: 20,
                        total: 20,
                    });
                    return {};
                });
            };

            setTimeout(() => {
                online = true;
                stream.resume();
            }, 200);

            stream.start();
            return stream.wait().then((result) => {
                expect(sent).to.equal(50);
            });
        })
    })
})
