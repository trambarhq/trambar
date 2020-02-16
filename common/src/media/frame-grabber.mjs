import _ from 'lodash';

/**
 * Capture a frame from a video element
 *
 * @param  {HTMLVideoElement} video
 * @param  {Object} options
 *
 * @return {Promise<Blob>}
 */
function capture(video, options) {
  return new Promise((resolve, reject) => {
    let width = video.videoWidth;
    let height = video.videoHeight;
    let canvas = document.createElement('CANVAS');
    canvas.width = width;
    canvas.height = height;
    let attempts = 1;
    let biggest = null;
    let live = (video.duration === Infinity);
    let startTime = _.get(options, 'start', 0);
    let timeLimit = _.get(options, 'timeout', 1000);

    function onBlob(blob) {
      if (live) {
        onSuccess(blob);
      } else {
        if (blob) {
          // check compression ratio to see if image is mostly blank
          let uncompressedSize = width * height * 3;
          let compressedSize = blob.size;
          let compressionRatio = compressedSize / uncompressedSize;
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
        } else {
          onFailure(new Error('Unable to obtain a frame'));
        }
      }
    }

    function onSeeked(evt) {
      try {
        // draw the current video frame on the canvas and encode as
        // jpeg file
        let context = canvas.getContext('2d');
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

    let timeout;
    if (live) {
      onSeeked();
    } else {
      // perform capture when video playhead has reached the desired time
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('ended', () => {
        onFailure(new Error('Unable to obtain an image before video ended'));
      });
      video.currentTime = startTime;

      // set a timeout, in case we're not getting expected events from video
      timeout = setTimeout(() => {
        onFailure(new Error('Unable to obtain an image within time limit'));
      }, timeLimit);
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
    let B64toBlob = require('b64-to-blob');
    let dataURL = canvas.toDataURL(mimeType, quality);
    let base64Data = dataURL.replace('data:image/jpeg;base64,', '');
    let blob = B64toBlob(base64Data, 'image/jpeg');
    cb(blob);
  }
}

export {
  capture,
};
