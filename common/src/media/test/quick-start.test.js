import Chai, { expect } from 'chai';

import {
  optimizeVideo
} from '../quick-start.js';
import {
  loadVideo,
} from '../media-loader.js';

import videoData from './videos/small.mp4';

describe('QuickStart', function() {
  describe('#optimizeVideo()', function() {
    it('should yield a new video with moov repositioned', async function() {
      let blob = new Blob([ videoData ], { type: 'video/mp4' });
      let processed = await optimizeVideo(blob);
      expect(processed).to.not.be.null;

      let video = await loadVideo(processed);
      expect(video).to.have.property('videoWidth').that.is.above(0);
      expect(video).to.have.property('videoHeight').that.is.above(0);
    })
    it('should return null when a video has already been processed', async function() {
      let blob = new Blob([ videoData ], { type: 'video/mp4' });
      let processed = await optimizeVideo(blob);
      expect(processed).to.not.be.null;
      let reprocessed = await optimizeVideo(processed);
      expect(reprocessed).to.be.null;
    })
  })
})
