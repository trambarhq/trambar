import _ from 'lodash';
import Promise from 'bluebird';
import Chai, { expect } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import HTTPRequest from 'transport/http-request';
import ManualPromise from 'utils/manual-promise';
import TestServer from './lib/test-server';

import PayloadManager from 'transport/payload-manager';

let port = 7777;
let baseURL = `http://localhost:${port}`;

let testObject = _.range(1, 500);
let testJSON = JSON.stringify(testObject);
let testBlob1 = new Blob([ testJSON ], { type: 'text/plain' });

let testString = _.repeat('Hello world\n', 500);
let testBlob2 = new Blob([ testString ], { type: 'text/plain' });

describe('PayloadManager', function() {
    before(() => {
        return TestServer.start(port);
    })

    let options = {
        uploadURL: (destination, id, type, part) => {
            return `${baseURL}/upload/${id}/${part}`;
        },
        streamURL: (destination, id) => {
            return `${baseURL}/stream/${id}`;
        },
    }

    describe('#add()', function() {
        it('should add a payload', function() {
            let payloadManager = new PayloadManager(options);
            payloadManager.activate();
            let destination = { address: baseURL, schema: 'test' }
            let payload = payloadManager.add(destination, 'image');
            expect(payload.id).to.be.a('string');
        })
        it('should permit null as destination', function() {
            let payloadManager = new PayloadManager(options);
            payloadManager.activate();
            let payload = payloadManager.add(null, 'image');
            expect(payload.id).to.be.a('string');
        })
    })
    describe('#dispatch()', function() {
        it('should send payload with a single file', function() {
            let payloadManager = new PayloadManager(options);
            payloadManager.activate();
            let payload = payloadManager.add(null, 'image');
            payload.attachFile(testBlob1);
            let completeEventPromise = new ManualPromise;
            payload.onComplete = completeEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);
            return completeEventPromise.then(() => {
                let url = `${baseURL}/download/${payload.id}/main`;
                return HTTPRequest.fetch('GET', url).then((result) => {
                    expect(result).to.equal(testJSON);
                });
            });
        })
        it('should send payload with two files', function() {
            let payloadManager = new PayloadManager(options);
            payloadManager.activate();
            let payload = payloadManager.add(null, 'image');
            payload.attachFile(testBlob1);
            payload.attachFile(testBlob2, 'second');
            let completeEventPromise = new ManualPromise;
            payload.onComplete = completeEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);
            return completeEventPromise.then(() => {
                let url = `${baseURL}/download/${payload.id}/main`;
                return HTTPRequest.fetch('GET', url).then((result) => {
                    expect(result).to.equal(testJSON);
                });
            }).then(() => {
                let url = `${baseURL}/download/${payload.id}/second`;
                return HTTPRequest.fetch('GET', url).then((result) => {
                    expect(result).to.equal(testString);
                });
            });
        })
        it('should not send payload when payload manager is inactive', function() {
            let payloadManager = new PayloadManager(options);
            let payload = payloadManager.add(null, 'image');
            payload.attachFile(testBlob1);
            let completeEventPromise = new ManualPromise;
            payload.onComplete = completeEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);
            return expect(completeEventPromise.timeout(100))
                .to.eventually.be.rejectedWith(Promise.TimeoutError);
        })
        it('should send payload when payload manager becomes active', function() {
            let payloadManager = new PayloadManager(options);
            let payload = payloadManager.add(null, 'image');
            payload.attachFile(testBlob1);
            let completeEventPromise = new ManualPromise;
            payload.onComplete = completeEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);
            setTimeout(() => {
                payloadManager.activate();
            }, 100);            
            return completeEventPromise.timeout(200).then(() => {
                let url = `${baseURL}/download/${payload.id}/main`;
                return HTTPRequest.fetch('GET', url).then((result) => {
                    expect(result).to.equal(testJSON);
                });
            });
        })
    })
    describe('#stream()', function() {
        it('should send blobs to server as they are added to stream', function() {
            let payloadManager = new PayloadManager(options);
            payloadManager.activate();
            let stream = payloadManager.stream(null);
            let payload = payloadManager.add(null, 'text');
            payload.attachStream(stream);

            let streamCompleteEventPromise = new ManualPromise;
            stream.onComplete = streamCompleteEventPromise.resolve;
            let chunks = chunkBlob(testBlob2, 1000);
            let interval = setInterval(() => {
                let chunk = chunks.shift();
                if (chunk) {
                    stream.push(chunk);
                } else {
                    stream.close();
                    clearInterval(interval);
                }
            }, 50);

            let payloadCompleteEventPromise = new ManualPromise;
            payload.onComplete = payloadCompleteEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);

            return payloadCompleteEventPromise.then(() => {
                return streamCompleteEventPromise.then(() => {
                    let url = `${baseURL}/download/${payload.id}/main`;
                    return HTTPRequest.fetch('GET', url).then((result) => {
                        expect(result).to.equal(testString);
                    });
                });
            });
        })
        it ('should keep a stream suspend when PayloadManager is inactive', function() {
            let payloadManager = new PayloadManager(options);
            let stream = payloadManager.stream(null).pipe(testBlob2, 100);
            let payload = payloadManager.add(null, 'text');
            payload.attachStream(stream);

            let completeEventPromise = new ManualPromise;
            stream.onComplete = completeEventPromise.resolve;

            return expect(completeEventPromise.timeout(350))
                .to.eventually.be.rejectedWith(Promise.TimeoutError);
        })
        it('should start a suspended stream once payload manager becomes active', function() {
            let payloadManager = new PayloadManager(options);
            let stream = payloadManager.stream(null).pipe(testBlob2, 1000);
            let payload = payloadManager.add(null, 'text');
            payload.attachStream(stream);

            let streamCompleteEventPromise = new ManualPromise;
            stream.onComplete = streamCompleteEventPromise.resolve;

            let payloadCompleteEventPromise = new ManualPromise;
            payload.onComplete = payloadCompleteEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);

            setTimeout(() => {
                payloadManager.activate();
            }, 250);

            return payloadCompleteEventPromise.then(() => {
                return streamCompleteEventPromise.then(() => {
                    let url = `${baseURL}/download/${payload.id}/main`;
                    return HTTPRequest.fetch('GET', url).then((result) => {
                        expect(result).to.equal(testString);
                    });
                });
            });
        })
    })
    describe('#inquire()', function() {
        it('should return information about a set of payloads', function() {
        })
    })
    describe('#getUploadProgress()', function() {
        it('should return overall upload progress', function() {
        })
    })

    after(() => {
        return TestServer.stop();
    })
})

function chunkBlob(blob, chunkSize) {
    let chunks = [];
    let total = blob.size;
    let type = blob.type;
    for (let offset = 0; offset < total; offset += chunkSize) {
        let byteCount = Math.min(chunkSize, total - offset);
        let chunk = blob.slice(offset, offset + byteCount, type);
        chunks.push(chunk);
    }
    return chunks;
}
