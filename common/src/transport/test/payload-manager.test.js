import _ from 'lodash';
import Chai, { expect } from 'chai';
import { TestServer } from './lib/test-server.js';
import { promiseSelf } from '../../utils/promise-self.js';
import { delay } from '../../utils/delay.js';

import { performHTTPRequest } from '../http-request.js';
import { PayloadManager } from '../payload-manager.js';

const port = 7777;
const baseURL = `http://localhost:${port}`;

const testObject = Array(500).fill(0, 0, 500);
const testJSON = JSON.stringify(testObject);
const testBlob1 = new Blob([ testJSON ], { type: 'text/plain' });

const testString = Array(500).fill('Hello world\n', 0, 500).join('');
const testBlob2 = new Blob([ testString ], { type: 'text/plain' });

describe('PayloadManager', function() {
  before(() => {
    return TestServer.start(port);
  })

  const options = {
    uploadURL: (destination, id, type, part) => {
      return `${baseURL}/upload/${id}/${part}`;
    },
    streamURL: (destination, id) => {
      return `${baseURL}/stream/${id}`;
    },
  }

  describe('#add()', function() {
    it('should add a payload', async function() {
      const payloadManager = new PayloadManager(options);
      payloadManager.activate();
      const destination = { address: baseURL, schema: 'test' }
      const payload = payloadManager.add(destination, 'image');
      expect(payload.id).to.be.a('string');
    })
    it('should permit null as destination', async function() {
      const payloadManager = new PayloadManager(options);
      payloadManager.activate();
      const payload = payloadManager.add(null, 'image');
      expect(payload.id).to.be.a('string');
    })
  })
  describe('#dispatch()', function() {
    it('should send payload with a single file', async function() {
      const payloadManager = new PayloadManager(options);
      payloadManager.activate();
      const payload = payloadManager.add(null, 'image');
      payload.attachFile(testBlob1);
      const completeEventPromise = promiseSelf();
      payload.onComplete = completeEventPromise.resolve;
      payloadManager.dispatch([ payload.id ]);
      await completeEventPromise
      const url = `${baseURL}/download/${payload.id}/main`;
      const result = await performHTTPRequest('GET', url);
      expect(result).to.equal(testJSON);
    })
    it('should send payload with two files', async function() {
      const payloadManager = new PayloadManager(options);
      payloadManager.activate();
      const payload = payloadManager.add(null, 'image');
      payload.attachFile(testBlob1);
      payload.attachFile(testBlob2, 'second');
      const completeEventPromise = promiseSelf();
      payload.onComplete = completeEventPromise.resolve;
      payloadManager.dispatch([ payload.id ]);
      await completeEventPromise;
      const url1 = `${baseURL}/download/${payload.id}/main`;
      const result1 = await performHTTPRequest('GET', url1);
      expect(result1).to.equal(testJSON);
      const url2 = `${baseURL}/download/${payload.id}/second`;
      const result2 = await performHTTPRequest('GET', url2);
      expect(result2).to.equal(testString);
    })
    it('should not send payload when payload manager is inactive', async function() {
      const payloadManager = new PayloadManager(options);
      const payload = payloadManager.add(null, 'image');
      payload.attachFile(testBlob1);
      const completeEventPromise = promiseSelf();
      payload.onComplete = completeEventPromise.resolve;
      payloadManager.dispatch([ payload.id ]);
      const result = await Promise.race([
        completeEventPromise,
        delay(100).then(() => 'timeout')
      ]);
      expect(result).to.equal('timeout');
    })
    it('should send payload when payload manager becomes active', async function() {
      const payloadManager = new PayloadManager(options);
      const payload = payloadManager.add(null, 'image');
      payload.attachFile(testBlob1);
      const completeEventPromise = promiseSelf();
      payload.onComplete = completeEventPromise.resolve;
      payloadManager.dispatch([ payload.id ]);
      setTimeout(() => {
        payloadManager.activate();
      }, 100);
      await completeEventPromise;
      const url = `${baseURL}/download/${payload.id}/main`;
      const result = await performHTTPRequest('GET', url);
      expect(result).to.equal(testJSON);
    })
  })
  describe('#stream()', function() {
    it('should send blobs to server as they are added to stream', async function() {
      const payloadManager = new PayloadManager(options);
      payloadManager.activate();
      const stream = payloadManager.stream(null);
      const payload = payloadManager.add(null, 'text');
      payload.attachStream(stream);

      const streamCompleteEventPromise = promiseSelf();
      stream.onComplete = streamCompleteEventPromise.resolve;
      const chunks = chunkBlob(testBlob2, 1000);
      const interval = setInterval(() => {
        const chunk = chunks.shift();
        if (chunk) {
          stream.push(chunk);
        } else {
          stream.close();
          clearInterval(interval);
        }
      }, 50);

      const payloadCompleteEventPromise = promiseSelf();
      payload.onComplete = payloadCompleteEventPromise.resolve;
      payloadManager.dispatch([ payload.id ]);

      await payloadCompleteEventPromise;
      await streamCompleteEventPromise;
      const url = `${baseURL}/download/${payload.id}/main`;
      const result = await performHTTPRequest('GET', url);
      expect(result).to.equal(testString);
    })
    it ('should keep a stream suspend when PayloadManager is inactive', async function() {
      const payloadManager = new PayloadManager(options);
      const stream = payloadManager.stream(null).pipe(testBlob2, 100);
      const payload = payloadManager.add(null, 'text');
      payload.attachStream(stream);

      const completeEventPromise = promiseSelf();
      stream.onComplete = completeEventPromise.resolve;

      const result = await Promise.race([
        completeEventPromise,
        delay(350).then(() => 'timeout')
      ]);
      expect(result).to.equal('timeout');
    })
    it('should start a suspended stream once payload manager becomes active', async function() {
      const payloadManager = new PayloadManager(options);
      const stream = payloadManager.stream(null).pipe(testBlob2, 1000);
      const payload = payloadManager.add(null, 'text');
      payload.attachStream(stream);

      const streamCompleteEventPromise = promiseSelf();
      stream.onComplete = streamCompleteEventPromise.resolve;

      const payloadCompleteEventPromise = promiseSelf();
      payload.onComplete = payloadCompleteEventPromise.resolve;
      payloadManager.dispatch([ payload.id ]);

      setTimeout(() => {
        payloadManager.activate();
      }, 250);

      await payloadCompleteEventPromise;
      await streamCompleteEventPromise;
      const url = `${baseURL}/download/${payload.id}/main`;
      const result = await performHTTPRequest('GET', url);
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
  const chunks = [];
  const total = blob.size;
  const type = blob.type;
  for (let offset = 0; offset < total; offset += chunkSize) {
    const byteCount = Math.min(chunkSize, total - offset);
    const chunk = blob.slice(offset, offset + byteCount, type);
    chunks.push(chunk);
  }
  return chunks;
}
