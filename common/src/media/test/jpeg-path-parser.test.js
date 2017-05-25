var Chai = require('chai'), expect = Chai.expect;

var JpegPathParser = require('media/jpeg-path-parser');

var testImage = require('./images/malgorzata-socha.jpg');

describe('JpegPathParser', () => {
    describe('#parse()', () => {
        it('should extract paths from a JPEG file', () => {
            var paths = JpegPathParser.parse(testImage);
            expect(paths).to.not.be.empty;
            for(var name in paths) {
                expect(paths[name]).to.not.be.emtpy;
            }
        })
    })
    describe('#createSVGPath()', () => {
        it('should extract paths from a JPEG file', () => {
            var paths = JpegPathParser.parse(testImage);
            for(var name in paths) {
                var svgPath = JpegPathParser.createSVGPath(paths[name], 500, 500);
                expect(svgPath).to.match(/^(M\d+,\d+)( C\d+,\d+ \d+,\d+ \d+,\d+)+/);
            }
        })
    })

})
