var Chai = require('chai'), expect = Chai.expect;

var JPEGAnalyser = require('media/jpeg-analyser');

var imageWithPaths = require('./images/malgorzata-socha.jpg');
var imagesWithOrientation = [
    require('./images/orientation-1.jpg'),
    require('./images/orientation-2.jpg'),
    require('./images/orientation-3.jpg'),
    require('./images/orientation-4.jpg'),
    require('./images/orientation-5.jpg'),
    require('./images/orientation-6.jpg'),
    require('./images/orientation-7.jpg'),
    require('./images/orientation-8.jpg'),
];

describe('JPEGAnalyser', function() {
    describe('#getDimensions()', function() {
        it('should find dimensions of a JPEG file', function() {
            var dimensions = JPEGAnalyser.getDimensions(imageWithPaths);
            expect(dimensions).to.have.property('width', 640);
            expect(dimensions).to.have.property('height', 463);
        })
    })
    describe('#getOrientation()', function() {
        it('should find orientation of JPEG files', function() {
            var orientations = _.map(imagesWithOrientation, (image) => {
                return JPEGAnalyser.getOrientation(image);
            });
            expect(orientations).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
        })
    })
    describe('#extractPaths()', function() {
        it('should extract paths from a JPEG file', function() {
            var paths = JPEGAnalyser.extractPaths(imageWithPaths);
            expect(paths).to.not.be.empty;
            for(var name in paths) {
                expect(paths[name]).to.not.be.emtpy;
            }
        })
    })
})
