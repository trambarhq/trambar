import Chai from 'chai', expect = Chai.expect;

import JPEGAnalyser from 'media/jpeg-analyser';
import SVGPath from 'media/svg-path';

import testImage from './images/malgorzata-socha.jpg';

describe('JPEGAnalyser', function() {
    describe('#createSVGPath()', function() {
        it('should extract paths from a JPEG file', function() {
            let paths = JPEGAnalyser.extractPaths(testImage);
            for(let name in paths) {
                let svgPath = SVGPath.create(paths[name], 500, 500);
                expect(svgPath).to.match(/^(M\d+,\d+)( C\d+,\d+ \d+,\d+ \d+,\d+)+/);
            }
        })
    })
})
