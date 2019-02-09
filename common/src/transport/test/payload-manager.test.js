import _ from 'lodash';
import Bluebird from 'bluebird';
import Chai, { expect } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import * as HTTPRequest from 'transport/http-request';
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
        it('should add a payload', async function() {
            let payloadManager = new PayloadManager(options);
            payloadManager.activate();
            let destination = { address: baseURL, schema: 'test' }
            let payload = payloadManager.add(destination, 'image');
            expect(payload.id).to.be.a('string');
        })
        it('should permit null as destination', async function() {
            let payloadManager = new PayloadManager(options);
            payloadManager.activate();
            let payload = payloadManager.add(null, 'image');
            expect(payload.id).to.be.a('string');
        })
    })
    describe('#dispatch()', function() {
        it('should send payload with a single file', async function() {
            let payloadManager = new PayloadManager(options);
            payloadManager.activate();
            let payload = payloadManager.add(null, 'image');
            payload.attachFile(testBlob1);
            let completeEventPromise = ManualPromise();
            payload.onComplete = completeEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);
            await completeEventPromise
            let url = `${baseURL}/download/${payload.id}/main`;
            let result = await HTTPRequest.fetch('GET', url);
            expect(result).to.equal(testJSON);
        })
        it('should send payload with two files', async function() {
            let payloadManager = new PayloadManager(options);
            payloadManager.activate();
            let payload = payloadManager.add(null, 'image');
            payload.attachFile(testBlob1);
            payload.attachFile(testBlob2, 'second');
            let completeEventPromise = ManualPromise();
            payload.onComplete = completeEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);
            await completeEventPromise;
            let url1 = `${baseURL}/download/${payload.id}/main`;
            let result1 = await HTTPRequest.fetch('GET', url1);
            expect(result1).to.equal(testJSON);
            let url2 = `${baseURL}/download/${payload.id}/second`;
            let result2 = await HTTPRequest.fetch('GET', url2);
            expect(result2).to.equal(testString);
        })
        it('should not send payload when payload manager is inactive', async function() {
            let payloadManager = new PayloadManager(options);
            let payload = payloadManager.add(null, 'image');
            payload.attachFile(testBlob1);
            let completeEventPromise = ManualPromise();
            payload.onComplete = completeEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);
            let result = await Promise.race([
                completeEventPromise,
                Bluebird.resolve('timeout').delay(100)
            ]);
            expect(result).to.equal('timeout');
        })
        it('should send payload when payload manager becomes active', async function() {
            let payloadManager = new PayloadManager(options);
            let payload = payloadManager.add(null, 'image');
            payload.attachFile(testBlob1);
            let completeEventPromise = ManualPromise();
            payload.onComplete = completeEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);
            setTimeout(() => {
                payloadManager.activate();
            }, 100);
            await completeEventPromise;
            let url = `${baseURL}/download/${payload.id}/main`;
            let result = await HTTPRequest.fetch('GET', url);
            expect(result).to.equal(testJSON);
        })
    })
    describe('#stream()', function() {
        it('should send blobs to server as they are added to stream', async function() {
            let payloadManager = new PayloadManager(options);
            payloadManager.activate();
            let stream = payloadManager.stream(null);
            let payload = payloadManager.add(null, 'text');
            payload.attachStream(stream);

            let streamCompleteEventPromise = ManualPromise();
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

            let payloadCompleteEventPromise = ManualPromise();
            payload.onComplete = payloadCompleteEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);

            await payloadCompleteEventPromise;
            await streamCompleteEventPromise;
            let url = `${baseURL}/download/${payload.id}/main`;
            let result = await HTTPRequest.fetch('GET', url);
            expect(result).to.equal(testString);
        })
        it ('should keep a stream suspend when PayloadManager is inactive', async function() {
            let payloadManager = new PayloadManager(options);
            let stream = payloadManager.stream(null).pipe(testBlob2, 100);
            let payload = payloadManager.add(null, 'text');
            payload.attachStream(stream);

            let completeEventPromise = ManualPromise();
            stream.onComplete = completeEventPromise.resolve;

            let result = await Promise.race([
                completeEventPromise,
                Bluebird.resolve('timeout').delay(350),
            ]);
            expect(result).to.equal('timeout');
        })
        it('should start a suspended stream once payload manager becomes active', async function() {
            let payloadManager = new PayloadManager(options);
            let stream = payloadManager.stream(null).pipe(testBlob2, 1000);
            let payload = payloadManager.add(null, 'text');
            payload.attachStream(stream);

            let streamCompleteEventPromise = ManualPromise();
            stream.onComplete = streamCompleteEventPromise.resolve;

            let payloadCompleteEventPromise = ManualPromise();
            payload.onComplete = payloadCompleteEventPromise.resolve;
            payloadManager.dispatch([ payload.id ]);

            setTimeout(() => {
                payloadManager.activate();
            }, 250);

            await payloadCompleteEventPromise;
            await streamCompleteEventPromise;
            let url = `${baseURL}/download/${payload.id}/main`;
            let result = await HTTPRequest.fetch('GET', url);
            expect(result).to.equal(testString);
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
