import Chai, { expect } from 'chai';

import * as QuickStart from '../quick-start.js';
import * as MediaLoader from '../media-loader.js';

import videoData from './videos/small.mp4';

describe('QuickStart', function() {
  describe('#process()', function() {
    it('should yield a new video with moov repositioned', async function() {
      let blob = new Blob([ videoData ], { type: 'video/mp4' });
      let processed = await QuickStart.process(blob);
      expect(processed).to.not.be.null;

      let video = await MediaLoader.loadVideo(processed);
      expect(video).to.have.property('videoWidth').that.is.above(0);
      expect(video).to.have.property('videoHeight').that.is.above(0);
    })
    it('should return null when a video has already been processed', async function() {
      let blob = new Blob([ videoData ], { type: 'video/mp4' });
      let processed = await QuickStart.process(blob);
      expect(processed).to.not.be.null;
      let reprocessed = await QuickStart.process(processed);
      expect(reprocessed).to.be.null;
    })
  })
})
