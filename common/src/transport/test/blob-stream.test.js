import Promise from 'bluebird';
import Chai, { expect } from 'chai';

import BlobStream from 'transport/blob-stream';
import * as HTTPRequest from 'transport/http-request';
import HTTPError from  'errors/http-error';

describe('BlobStream', function() {
    let fetchOriginal = HTTPRequest.fetch;
    after(function() {
        HTTPRequest.fetch = fetchOriginal;
    })

    describe('#pull()', function() {
        it('should take a blob that was pushed in previously', function() {
            let stream = new BlobStream('http://somewhere/1', {});
            let blob = new Blob([ 'Hello' ]);
            stream.push(blob);
            return stream.pull().then((b) => {
                return expect(b).to.equal(blob);
            });
        })
        it('should wait when stream is empty', function() {
            let stream = new BlobStream('http://somewhere/2', {});
            let promise1 = stream.pull();
            let promise2 = Promise.delay(250).return('timeout');
            return Promise.race([ promise1, promise2 ]).then((result) => {
                return expect(result).to.equal('timeout');
            });
        })
    })
    describe('#push()', function() {
        it('should cause an earlier call to pull() to resolve', function() {
            let stream = new BlobStream('http://somewhere/3', {});
            let promise1 = stream.pull();
            let promise2 = Promise.delay(1000).return('timeout');
            let blob = new Blob([ 'Hello' ]);
            setTimeout(() => {
                stream.push(blob);
            }, 100);
            return Promise.race([ promise1, promise2 ]).then((result) => {
                return expect(result).to.equal(blob);
            });
        })
    })
    describe('#close()', function() {
        it('should cause an earlier call to pull() to resolve to null', function() {
            let stream = new BlobStream('http://somewhere/4', {});
            let promise1 = stream.pull();
            let promise2 = Promise.delay(1000).return('timeout');
            setTimeout(() => {
                stream.close();
            }, 100);
            return Promise.race([ promise1, promise2 ]).then((result) => {
                return expect(result).to.be.null;
            });
        })
    })
    describe('#wait()', function() {
        it('should wait til all blobs to be finalized', function() {
            let stream = new BlobStream('http://somewhere/5', {});
            _.each(_.range(1, 5), (num) => {
                let blob = new Blob([ `Blob #${num}` ]);
                stream.push(blob);
            });
            stream.close();
            let count = 0;
            let interval = setInterval(() => {
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
            let stream = new BlobStream('http://somewhere/6', {});
            _.each(_.range(1, 5), (num) => {
                let blob = new Blob([ `Blob #${num}` ]);
                stream.push(blob);
            });
            stream.close();
            let count = 0;
            let interval = setInterval(() => {
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
    describe('#start()', function() {
        it('should send chunks to remote server, one at a time', function() {
            this.timeout(5000);

            let stream = new BlobStream('http://somewhere/7', {});
            _.each(_.range(1, 51), (num) => {
                let blob = new Blob([ `Blob #${num}` ]);
                stream.push(blob);
            });
            stream.close();

            let sent = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                let onUploadProgress = options.onUploadProgress;
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
                let all = stream.toBlob();
                expect(sent).to.equal(50);
                expect(stream.transferred).to.equal(all.size);
            });
        })
        it('should reattempt a chunk when an error occurs', function() {
            this.timeout(30000);

            let stream = new BlobStream('http://somewhere/7', {});
            _.each(_.range(1, 51), (num) => {
                let blob = new Blob([ `Blob #${num}` ]);
                stream.push(blob);
            });
            stream.close();

            let sent = 0;
            let errors = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                let onUploadProgress = options.onUploadProgress;
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

            let stream = new BlobStream('http://somewhere/8', {});
            _.each(_.range(1, 51), (num) => {
                let blob = new Blob([ `Blob #${num}` ]);
                stream.push(blob);
            });
            stream.close();
            stream.suspend();

            let sent = 0;
            let online = false;
            HTTPRequest.fetch = (method, url, payload, options) => {
                let onUploadProgress = options.onUploadProgress;
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
