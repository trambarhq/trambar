import { expect } from 'chai';

import * as MediaLoader from 'media/media-loader';
import * as FrameGrabber from 'media/frame-grabber';

import videoData from './videos/small.mp4';

describe('FrameGrabber', function() {
    describe('#capture()', function() {
        it('should obtain a frame from test video', function() {
            this.timeout(5000);

            let blob = new Blob([ videoData ], { type: 'video/mp4' });
            return MediaLoader.loadVideo(blob).then((video) => {
                return FrameGrabber.capture(video, { timeout: 5000 }).then((blob) => {
                    expect(blob).to.have.property('type', 'image/jpeg');
                    expect(blob).to.have.property('size').that.is.above(30000);
                });
            });
        })
    })
})
