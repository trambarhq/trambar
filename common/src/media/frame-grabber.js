var _ = require('lodash');
var Promise = require('bluebird');
var BlobReader = require('utils/blob-reader');

exports.capture = capture;

function capture(file, startTime) {
    return BlobReader.loadVideo(file).then((video) => {
        return findFrame(video, startTime || 0);
    });
}

function findFrame(video, startTime) {
    return new Promise((resolve, reject) => {
        var width = video.videoWidth;
        var height = video.videoHeight;
        var canvas = document.createElement('CANVAS');
        canvas.width = width;
        canvas.height = height;
        var attempts = 1;
        var biggest = null;

        function onBlob(blob) {
            // check compression ratio to see if image is mostly blank
            var uncompressedSize = width * height * 3;
            var compressedSize = blob.size;
            var compressionRatio = compressedSize / uncompressedSize;
            if (compressionRatio > 1 / 50) {
                onSuccess(blob);
            } else {
                if (!biggest || biggest.size < blob.size) {
                    biggest = blob;
                }
                if (attempts > 10) {
                    onSuccess(biggest);
                } else {
                    // move the playhead by a second
                    video.currentTime += 1000;
                    attempts++;
                }
            }
        }

        function onSeeked(evt) {
            try {
                // draw the current video frame on the canvas and encode as
                // jpeg file
                var context = canvas.getContext('2d');
    		    context.drawImage(video, 0, 0, width, height);
                canvas.toBlob(onBlob, 'image/jpeg', 75);
    		} catch(err) {
                onFailure(err);
    		}
        }

        function onSuccess(blob) {
            cleanUp();
            resolve(blob);
        }

        function onFailure(err) {
            cleanUp();
            if (biggest) {
                resolve(biggest);
            } else {
                reject(err);
            }
        }

        // perform capture when video playhead has reached the desired time
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('ended', () => {
            onFailure(new Error('Unable to obtain an image before video ended'));
        });
        video.currentTime = startTime;

        // set a timeout, in case we're not getting expected events from video
        var timeout = setTimeout(() => {
            onFailure(new Error('Unable to obtain an image within time limit'));
        }, 1000);

        function cleanUp() {
            video.removeEventListener('seeked', onSeeked);
            clearTimeout(timeout);
        }
    });
}
