import { expect } from 'chai';

import {
  loadImage
} from '../media-loader.js';
import {
  extractAlbumArt
} from '../media-tag-reader.js';

import audioData1 from './audios/sample1.mp3';
import audioData2 from './audios/sample2.mp3';

describe('MediaTagReader', function() {
  describe('#extractAlbumArt()', function() {
    it('should extract album art from MP3 file', async function() {
      const audioBlob = new Blob([ audioData1 ], { type: 'audio/mp3' });
      const imageBlob = await extractAlbumArt(audioBlob);
      expect(imageBlob).to.have.property('type', 'image/png');
      const image = await loadImage(imageBlob);
      expect(image).to.have.property('naturalWidth', 495);
      expect(image).to.have.property('naturalHeight', 500);
    })
    it('should correctly handle file without metadata', async function() {
      const audioBlob = new Blob([ audioData2 ], { type: 'audio/mp3' });
      const imageBlob = await extractAlbumArt(audioBlob);
      expect(imageBlob).to.be.null;
    })
  })
})
