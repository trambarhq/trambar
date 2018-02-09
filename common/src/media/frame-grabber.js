var _ = require('lodash');
var Promise = require('bluebird');

module.exports = {
    capture,
}

function capture(video, startTime) {
    return new Promise((resolve, reject) => {
        var width = video.videoWidth;
        var height = video.videoHeight;
        var canvas = document.createElement('CANVAS');
        canvas.width = width;
        canvas.height = height;
        var attempts = 1;
        var biggest = null;
        var live = (video.duration === Infinity);

        function onBlob(blob) {
            if (live) {
                onSuccess(blob);
            } else {
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
        }

        function onSeeked(evt) {
            try {
                // draw the current video frame on the canvas and encode as
                // jpeg file
                var context = canvas.getContext('2d');
    		    context.drawImage(video, 0, 0, width, height);
                saveCanvasContents(canvas, 'image/jpeg', 0.75, onBlob);
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

        if (live) {
            onSeeked();
        } else {
            // perform capture when video playhead has reached the desired time
            video.addEventListener('seeked', onSeeked);
            video.addEventListener('ended', () => {
                onFailure(new Error('Unable to obtain an image before video ended'));
            });
            video.currentTime = startTime || 0;

            // set a timeout, in case we're not getting expected events from video
            var timeout = setTimeout(() => {
                onFailure(new Error('Unable to obtain an image within time limit'));
            }, 1000);
        }

        function cleanUp() {
            if (live) {
                video.removeEventListener('seeked', onSeeked);
                clearTimeout(timeout);
            }
        }
    });
}

/**
 * Save canvas contents to a blob using toBlob() if browser supports it,
 * otherwise fallback to toDataURL()
 *
 * @param  {HTMLCanvasElement} canvas
 * @param  {String} mimeType
 * @param  {Number} quality
 * @param  {Function} cb
 */
function saveCanvasContents(canvas, mimeType, quality, cb) {
    if (typeof(canvas.toBlob) === 'function') {
        canvas.toBlob(cb, mimeType, 90);
    } else {
        var B64toBlob = require('b64-to-blob');
        var dataURL = canvas.toDataURL(mimeType, quality);
        var base64Data = dataURL.replace('data:image/jpeg;base64,', '');
        var blob = B64toBlob(base64Data, 'image/jpeg');
        cb(blob);
    }
}
