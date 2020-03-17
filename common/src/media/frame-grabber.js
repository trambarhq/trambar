/**
 * Capture a frame from a video element
 *
 * @param  {HTMLVideoElement} video
 * @param  {Object} options
 *
 * @return {Promise<Blob>}
 */
async function captureFrame(video, options) {
  const { start = 0, timeout = 1000 } = options;
  const { videoWidth, videoHeight } = video;
  const canvas = document.createElement('CANVAS');
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const context = canvas.getContext('2d');
  const limitReached = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Unable to obtain an image within time limit'));
    }, timeout);
  });
  const live = (video.duration === Infinity);

  let biggest = null;
  try {
    for (let i = 0, time = start; i < 10; i++, time += 1000) {
      if (!live) {
        await Promise.race([ seekVideo(start), limitReached ]);
      }
      context.drawImage(video, 0, 0, videoWidth, videoHeight);
      const blob = await saveCanvasContents(canvas, 'image/jpeg', 0.75);
      if (!biggest || biggest.size < blob.size) {
        biggest = blob;
      }

      // check compression ratio to see if image is mostly blank
      const uncompressedSize = videoWidth * videoHeight * 3;
      const compressedSize = blob.size;
      const compressionRatio = compressedSize / uncompressedSize;
      if (compressionRatio > (1 / 50) || live) {
        break;
      }
    }
  } catch (err) {
    if (!biggest) {
      throw err;
    }
  }
  return biggest;
}

async function seekVideo(video, time) {
  video.currentTime = time;
  return new Promise((resolve, reject) => {
    attach();

    function onSeek() {
      detach();
      resolve();
    }

    function onEnded() {
      detach();
      reject(new Error('Unable to obtain an image before video ended'));
    }

    function attach() {
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('ended', onEnded);
    }

    function detach() {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('ended', onEnded);
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
 */
async function saveCanvasContents(canvas, mimeType, quality) {
  let blob;
  if (typeof(canvas.toBlob) === 'function') {
    blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, mimeType, 90)
    });
  } else {
    const { default: b64toBlob } = await import('b64-to-blob');
    const dataURL = canvas.toDataURL(mimeType, quality);
    const base64Data = dataURL.replace('data:image/jpeg;base64,', '');
    blob = b64toBlob(base64Data, 'image/jpeg');
  }
  return blob;
}

export {
  captureFrame,
};
