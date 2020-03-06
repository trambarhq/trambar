import Chai, { expect } from 'chai';

import {
  extractPaths,
} from '../jpeg-analyser.js';
import {
  createSVGPath
} from '../svg-path.js';

import testImage from './images/malgorzata-socha.jpg';

describe('JPEGAnalyser', function() {
  describe('#createSVGPath()', function() {
    it('should extract paths from a JPEG file', function() {
      let paths = extractPaths(testImage);
      for(let name in paths) {
        let svgPath = createSVGPath(paths[name], 500, 500);
        expect(svgPath).to.match(/^(M\d+,\d+)( C\d+,\d+ \d+,\d+ \d+,\d+)+/);
      }
    })
  })
})
