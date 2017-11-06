var Chai = require('chai'), expect = Chai.expect;

var QuickStart = require('media/quick-start');
var MediaLoader = require('media/media-loader');

var videoData = require('./videos/small.mp4');

describe('QuickStart', function() {
    describe('#process', function() {
        it('should yield a new video with moov repositioned', function() {
            var blob = new Blob([ videoData ], { type: 'video/mp4' });
            return QuickStart.process(blob).then((processed) => {
                expect(processed).to.not.be.null;
                var url = URL.createObjectURL(processed);
                // load the video to see if it's correct
                return MediaLoader.loadVideo(url).then((video) => {
                    expect(video).to.have.property('videoWidth').that.is.above(0);
                    expect(video).to.have.property('videoHeight').that.is.above(0);
                });
            });
        })
        it('should return null when a video has already been processed', function() {
            var blob = new Blob([ videoData ], { type: 'video/mp4' });
            return QuickStart.process(blob).then((processed) => {
                expect(processed).to.not.be.null;
                return QuickStart.process(processed).then((reprocessed) => {
                    expect(reprocessed).to.be.null;
                });
            });
        });
    })
})
