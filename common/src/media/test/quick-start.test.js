import Chai, { expect } from 'chai';

import * as QuickStart from 'media/quick-start';
import * as MediaLoader from 'media/media-loader';

import videoData from './videos/small.mp4';

describe('QuickStart', function() {
    describe('#process()', function() {
        it('should yield a new video with moov repositioned', function() {
            let blob = new Blob([ videoData ], { type: 'video/mp4' });
            return QuickStart.process(blob).then((processed) => {
                expect(processed).to.not.be.null;
                // load the video to see if it's correct
                return MediaLoader.loadVideo(processed).then((video) => {
                    expect(video).to.have.property('videoWidth').that.is.above(0);
                    expect(video).to.have.property('videoHeight').that.is.above(0);
                });
            });
        })
        it('should return null when a video has already been processed', function() {
            let blob = new Blob([ videoData ], { type: 'video/mp4' });
            return QuickStart.process(blob).then((processed) => {
                expect(processed).to.not.be.null;
                return QuickStart.process(processed).then((reprocessed) => {
                    expect(reprocessed).to.be.null;
                });
            });
        });
    })
})
