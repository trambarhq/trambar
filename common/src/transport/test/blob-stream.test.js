import Bluebird from 'bluebird';
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
        it('should take a blob that was pushed in previously', async function() {
            let stream = new BlobStream('http://somewhere/1', {});
            let blob = new Blob([ 'Hello' ]);
            stream.push(blob);
            let b = await stream.pull();
            expect(b).to.equal(blob);
        })
        it('should wait when stream is empty', async function() {
            let stream = new BlobStream('http://somewhere/2', {});
            let result = await Promise.race([
                stream.pull(),
                Bluebird.resolve('timeout').delay(250)
            ]);
            expect(result).to.equal('timeout');
        })
    })
    describe('#push()', function() {
        it('should cause an earlier call to pull() to resolve', async function() {
            let stream = new BlobStream('http://somewhere/3', {});
            let blob = new Blob([ 'Hello' ]);
            setTimeout(() => {
                stream.push(blob);
            }, 100);
            let result = await Promise.race([
                stream.pull(),
                Bluebird.resolve('timeout').delay(1000)
            ]);
            expect(result).to.equal(blob);
        })
    })
    describe('#close()', function() {
        it('should cause an earlier call to pull() to resolve to null', async function() {
            let stream = new BlobStream('http://somewhere/4', {});
            setTimeout(() => {
                stream.close();
            }, 100);
            let result = await Promise.race([
                stream.pull(),
                Bluebird.resolve('timeout').delay(1000)
            ]);
            expect(result).to.be.null;
        })
    })
    describe('#wait()', function() {
        it('should wait til all blobs to be finalized', async function() {
            let stream = new BlobStream('http://somewhere/5', {});
            for (let i = 1; i <= 50; i++) {
                let blob = new Blob([ `Blob #${i}` ]);
                stream.push(blob);
            }
            stream.close();
            let count = 0;
            let interval = setInterval(async () => {
                let blob = await stream.pull();
                count++;
                if (blob) {
                    stream.finalize(blob);
                } else {
                    clearInterval(interval);
                }
            }, 50);
            await stream.wait();
            expect(count).to.equal(4);
        })
        it('should reject when the stream was abandoned', async function() {
            let stream = new BlobStream('http://somewhere/6', {});
            for (let i = 1; i <= 50; i++) {
                let blob = new Blob([ `Blob #${i}` ]);
                stream.push(blob);
            }
            stream.close();
            let count = 0;
            let interval = setInterval(async () => {
                let blob = await stream.pull();
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
            }, 50);
            try {
                await stream.wait();
                expect.fail();
            } catch (err) {
                expect(err).to.be.instanceOf(Error);
            }
        })
    })
    describe('#start()', function() {
        it('should send chunks to remote server, one at a time', async function() {
            this.timeout(5000);

            let stream = new BlobStream('http://somewhere/7', {});
            for (let i = 1; i <= 50; i++) {
                let blob = new Blob([ `Blob #${i}` ]);
                stream.push(blob);
            }
            stream.close();

            let sent = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                let onUploadProgress = options.onUploadProgress;
                await Bluebird.delay(20);
                sent++;
                if (onUploadProgress) {
                    onUploadProgress({
                        type: 'progress',
                        target: {},
                        loaded: 20,
                        total: 20,
                    });
                }
                return {};
            };

            stream.start();
            let result = await stream.wait();
            let all = stream.toBlob();
            expect(sent).to.equal(50);
            expect(stream.transferred).to.equal(all.size);
        })
        it('should reattempt a chunk when an error occurs', async function() {
            this.timeout(30000);

            let stream = new BlobStream('http://somewhere/7', {});
            for (let i = 1; i <= 50; i++) {
                let blob = new Blob([ `Blob #${i}` ]);
                stream.push(blob);
            }
            stream.close();

            let sent = 0;
            let errors = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                let onUploadProgress = options.onUploadProgress;
                await Bluebird.delay(20);
                if (Math.random() > 0.90) {
                    if (errors < 2) {
                        errors++;
                        throw new HTTPError(504);
                    }
                }
                sent++;
                if (onUploadProgress) {
                    onUploadProgress({
                        type: 'progress',
                        target: {},
                        loaded: 20,
                        total: 20,
                    });
                }
                return {};
            };

            stream.start();
            let result = await stream.wait();
            expect(sent).to.equal(50);
            expect(errors).to.be.above(0);
        })
        it('should wait for resumption when suspected', async function() {
            this.timeout(5000);

            let stream = new BlobStream('http://somewhere/8', {});
            for (let i = 1; i <= 50; i++) {
                let blob = new Blob([ `Blob #${i}` ]);
                stream.push(blob);
            }
            stream.close();
            stream.suspend();

            let sent = 0;
            let online = false;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                let onUploadProgress = options.onUploadProgress;
                await Bluebird.delay(20);
                if (!online) {
                    throw new HTTPError(504);
                }
                sent++;
                if (onUploadProgress) {
                    onUploadProgress({
                        type: 'progress',
                        target: {},
                        loaded: 20,
                        total: 20,
                    });
                }
                return {};
            };

            setTimeout(() => {
                online = true;
                stream.resume();
            }, 200);

            stream.start();
            let result = await stream.wait();
            expect(sent).to.equal(50);
        })
    })
})
