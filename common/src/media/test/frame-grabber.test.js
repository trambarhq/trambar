import { expect } from 'chai';

import {
  loadVideo
} from '../media-loader.js';
import {
  captureFrame
} from '../frame-grabber.js';

import videoData from './videos/small.mp4';

describe('FrameGrabber', function() {
  describe('#captureFrame()', function() {
    it('should obtain a frame from test video', async function() {
      this.timeout(5000);

      const videoBlob = new Blob([ videoData ], { type: 'video/mp4' });
      const video = await loadVideo(videoBlob);
      const imageBlob = await captureFrame(video, { timeout: 5000 });
      expect(imageBlob).to.have.property('type', 'image/jpeg');
      expect(imageBlob).to.have.property('size').that.is.above(30000);
    })
    it('should function correctly using toDataURL() instead of toBlob()', async function() {
      this.timeout(5000);

      const videoBlob = new Blob([ videoData ], { type: 'video/mp4' });
      const video = await loadVideo(videoBlob);
      const imageBlob = await captureFrame(video, { timeout: 5000, toDataURL: true });
      expect(imageBlob).to.have.property('type', 'image/jpeg');
      expect(imageBlob).to.have.property('size').that.is.above(30000);
      expect(imageBlob).to.have.property('fromDataURL', true);
    })
    it('should time out', async function() {
      this.timeout(5000);

      const videoBlob = new Blob([ videoData ], { type: 'video/mp4' });
      const video = await loadVideo(videoBlob);
      try {
        const imageBlob = await captureFrame(video, { start: 3000, timeout: 10 });
        expect.fail();
      } catch (err) {
        expect(err.message).to.contain('time limit');
      }
    })
  })
})
