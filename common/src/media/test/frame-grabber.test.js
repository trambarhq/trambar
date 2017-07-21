var Chai = require('chai'), expect = Chai.expect;

var BlobReader = require('utils/blob-reader');
var FrameGrabber = require('media/frame-grabber');

var videoData = require('./videos/small.mp4');

describe('FrameGrabber', function() {
    describe('#capture', function() {
        it('should obtain a frame from test video', function() {
            var blob = new Blob([ videoData ], { type: 'video/mp4' });
            return BlobReader.loadVideo(blob).then((video) => {
                return FrameGrabber.capture(video).then((blob) => {
                    expect(blob).to.have.property('type', 'image/jpeg');
                    expect(blob).to.have.property('size').that.is.above(30000);
                });
            });
        })
    })
})
