var Chai = require('chai'), expect = Chai.expect;

var JpegAnalyser = require('media/jpeg-analyser');
var SVGPath = require('media/svg-path');

var testImage = require('./images/malgorzata-socha.jpg');

describe('JpegAnalyser', function() {
    describe('#createSVGPath()', function() {
        it('should extract paths from a JPEG file', function() {
            var paths = JpegAnalyser.extractPaths(testImage);
            for(var name in paths) {
                var svgPath = SVGPath.create(paths[name], 500, 500);
                expect(svgPath).to.match(/^(M\d+,\d+)( C\d+,\d+ \d+,\d+ \d+,\d+)+/);
            }
        })
    })
})
