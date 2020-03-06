import { expect } from 'chai';

import {
  loadVideo
} from '../media-loader.js';
import * as FrameGrabber from '../frame-grabber.js';

import videoData from './videos/small.mp4';

describe('FrameGrabber', function() {
  describe('#capture()', function() {
    it('should obtain a frame from test video', async function() {
      this.timeout(5000);

      let videoBlob = new Blob([ videoData ], { type: 'video/mp4' });
      let video = await loadVideo(videoBlob);
      let imageBlob = await FrameGrabber.capture(video, { timeout: 5000 });
      expect(imageBlob).to.have.property('type', 'image/jpeg');
      expect(imageBlob).to.have.property('size').that.is.above(30000);
    })
  })
})
