import Chai, { expect } from 'chai';
import { delay } from '../../utils/delay.js';

import { BlobStream } from '../blob-stream.js';
import { performHTTPRequest, mockHTTPRequest } from '../http-request.js';
import { HTTPError } from  '../../errors.js';

describe('BlobStream', function() {
  after(function() {
    mockHTTPRequest(false);
  })
  describe('#pull()', function() {
    it('should take a blob that was pushed in previously', async function() {
      const stream = new BlobStream('http://somewhere/1', {});
      const blob = new Blob([ 'Hello' ]);
      stream.push(blob);
      const b = await stream.pull();
      expect(b).to.equal(blob);
    })
    it('should wait when stream is empty', async function() {
      const stream = new BlobStream('http://somewhere/2', {});
      const result = await Promise.race([
        stream.pull(),
        delay(250).then(() => 'timeout')
      ]);
      expect(result).to.equal('timeout');
    })
  })
  describe('#push()', function() {
    it('should cause an earlier call to pull() to resolve', async function() {
      const stream = new BlobStream('http://somewhere/3', {});
      const blob = new Blob([ 'Hello' ]);
      setTimeout(() => {
        stream.push(blob);
      }, 100);
      const result = await Promise.race([
        stream.pull(),
        delay(1000).then(() => 'timeout')
      ]);
      expect(result).to.equal(blob);
    })
  })
  describe('#close()', function() {
    it('should cause an earlier call to pull() to resolve to null', async function() {
      const stream = new BlobStream('http://somewhere/4', {});
      setTimeout(() => {
        stream.close();
      }, 100);
      const result = await Promise.race([
        stream.pull(),
        delay(1000).then(() => 'timeout')
      ]);
      expect(result).to.be.null;
    })
  })
  describe('#wait()', function() {
    it('should wait til all blobs to be finalized', async function() {
      const stream = new BlobStream('http://somewhere/5', {});
      for (let i = 1; i <= 50; i++) {
        stream.push(new Blob([ `Blob #${i}` ]));
      }
      stream.close();
      let count = 0;
      const interval = setInterval(async () => {
        let blob = await stream.pull();
        count++;
        if (blob) {
          stream.finalize(blob);
        } else {
          clearInterval(interval);
        }
      }, 10);
      await stream.wait();
      expect(count).to.equal(50);
    })
    it('should reject when the stream was abandoned', async function() {
      const stream = new BlobStream('http://somewhere/6', {});
      for (let i = 1; i <= 50; i++) {
        stream.push(new Blob([ `Blob #${i}` ]));
      }
      stream.close();
      let count = 0;
      const interval = setInterval(async () => {
        const blob = await stream.pull();
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
        expect(err).to.have.property('message', 'Interrupted');
      }
    })
  })
  describe('#start()', function() {
    it('should send chunks to remote server, one at a time', async function() {
      this.timeout(5000);

      const stream = new BlobStream('http://somewhere/7', {});
      for (let i = 1; i <= 50; i++) {
        stream.push(new Blob([ `Blob #${i}` ]));
      }
      stream.close();

      let sent = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        const { onUploadProgress } = options;
        await delay(20);
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
      });

      stream.start();
      const result = await stream.wait();
      const all = stream.toBlob();
      expect(sent).to.equal(50);
      expect(stream.transferred).to.equal(all.size);
    })
    it('should wait for resumption when suspected', async function() {
      this.timeout(5000);

      const stream = new BlobStream('http://somewhere/8', {});
      for (let i = 1; i <= 50; i++) {
        stream.push(new Blob([ `Blob #${i}` ]));
      }
      stream.close();

      let sent = 0;
      let sentBeforeSuspending = 20;
      let sentBeforeResuming = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        const { onUploadProgress } = options;
        await delay(20);
        sent++;

        if (sent === sentBeforeSuspending) {
          stream.suspend();
          setTimeout(() => { sentBeforeResuming = sent }, 200);
          setTimeout(() => { stream.resume() }, 500);
        }

        if (onUploadProgress) {
          onUploadProgress({
            type: 'progress',
            target: {},
            loaded: 20,
            total: 20,
          });
        }
        return {};
      });

      stream.start();
      const result = await stream.wait();
      expect(sent).to.equal(50);
      expect(sentBeforeResuming).to.equal(sentBeforeSuspending);
    })
  })
})
