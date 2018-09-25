import Promise from 'bluebird';
import * as BlobManager from 'transport/blob-manager';
import * as BlobReader from 'transport/blob-reader';
import * as JPEGAnalyser from 'media/jpeg-analyser';
import * as FrameGrabber from 'media/frame-grabber';
import CordovaFile from 'transport/cordova-file';

/**
 * Load an image
 *
 * @param  {Blob|CordovaFile|String} blob
 *
 * @return {Promise<HTMLImageElement}
 */
function loadImage(blob) {
    let url;
    if (typeof(blob) === 'string') {
        url = blob;
    } else {
        if (blob instanceof CordovaFile) {
            return blob.getArrayBuffer().then((arrayBuffer) => {
                let newBlob = new Blob([ arrayBuffer ], { type: blob.type });
                return loadImage(newBlob);
            });
        }
        url = BlobManager.manage(blob);
    }
    return new Promise((resolve, reject) => {
        let image = document.createElement('IMG');
        image.src = url;
        image.onload = function(evt) {
            resolve(image);
        };
        image.onerror = function(evt) {
            console.log('load image error', evt.message)
            reject(new Error(`Unable to load ${url}`));
        };
    });
}

/**
 * Load an video
 *
 * @param  {Blob|CordovaFile|String} blob
 *
 * @return {Promise<HTMLVideoElement}
 */
function loadVideo(blob) {
    if (/iPhone/i.test(navigator.userAgent)) {
        // iPhone doesn't allow loading of video programmatically
        return Promise.reject('Cannot load video on iPhone');
    }
    let url;
    if (typeof(blob) === 'string') {
        url = blob;
    } else {
        url = BlobManager.manage(blob);
    }
    return new Promise((resolve, reject) => {
        let video = document.createElement('VIDEO');
        video.src = url;
        video.preload = true;
        video.onloadeddata = function(evt) {
            resolve(video);
        };
        video.onerror = function(evt) {
            reject(new Error(`Unable to load ${url}`));
        };
    });
}

/**
 * Load an audio
 *
 * @param  {Blob|CordovaFile|String} blob
 *
 * @return {Promise<HTMLAudioElement}
 */
function loadAudio(blob) {
    let url;
    if (typeof(blob) === 'string') {
        url = blob;
    } else {
        url = BlobManager.manage(blob);
    }
    return new Promise((resolve, reject) => {
        let audio = document.createElement('AUDIO');
        audio.src = url;
        audio.preload = true;
        audio.onloadeddata = function(evt) {
            resolve(audio);
        };
        audio.onerror = function(evt) {
            reject(new Error(`Unable to load ${url}`));
        };
    });
}

/**
 * Load an SVG picture
 *
 * @param  {Blob|CordovaFile|String} blob
 *
 * @return {Promise<HTMLImageElement}
 */
function loadSVG(blob) {
    return BlobReader.loadText(blob).then((xml) => {
        let parser = new DOMParser;
        let doc = parser.parseFromString(xml, 'text/xml');
        let svg = doc.getElementsByTagName('svg')[0];
        if (!svg) {
            throw new Error('Invalid SVG document');
        }
        return svg;
    });
}

/**
 * Obtain dimensions of image
 *
 * @param  {Blob|CordovaFile|String} blob
 *
 * @return {Promise<Object>}
 */
function getImageMetadata(blob) {
    if (typeof(blob) === 'string') {
        let url = blob;
        return BlobManager.fetch(url).then((blob) => {
            return getImageMetadata(blob);
        }).catch((err) => {
            // we might not be able to fetch the file as a blob
            // due to cross-site restriction
            return loadImage(url).then((img) => {
                return {
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    format: guessFileFormat(url, 'image')
                };
            });
        });
    } else {
        let format = extractFileFormat(blob.type);
        if (format === 'svg') {
            // naturalWidth and naturalHeight aren't correct when the SVG file
            // doesn't have width and height set
            return loadSVG(blob).then((svg) => {
                let width = svg.width.baseVal.value;
                let height = svg.height.baseVal.value;
                let viewBox = svg.viewBox.baseVal;
                if (!width) {
                    width = viewBox.width;
                }
                if (!height) {
                    height = viewBox.height;
                }
                if (!width) {
                    width = 1000;
                }
                if (!height) {
                    height = 1000;
                }
                return { width, height, format };
            });
        } else if (format === 'jpeg') {
            return BlobReader.loadUint8Array(blob).then((bytes) => {
                let dimensions = JPEGAnalyser.getDimensions(bytes);
                let orientation = JPEGAnalyser.getOrientation(bytes);
                if (!dimensions) {
                    throw new Error('Invalid JPEG file');
                }
                let width, height;
                if (orientation >= 5) {
                    width = dimensions.height;
                    height = dimensions.width;
                } else {
                    width = dimensions.width;
                    height = dimensions.height;
                }
                return { width, height, format };
            });
        } else {
            return loadImage(blob).then((img) => {
                return {
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    format: format,
                }
            });
        }
    }
}

/**
 * Obtain dimensions and duration of video
 *
 * @param  {Blob|CordovaFile|String} blob
 *
 * @return {Promise<Object>}
 */
function getVideoMetadata(blob) {
    if (typeof(blob) === 'string') {
        let url = blob;
        return BlobManager.fetch(url).then((blob) => {
            return getVideoMetadata(blob);
        }).catch((err) => {
            // we might not be able to fetch the file as a blob
            // due to cross-site restriction
            return loadVideo(url).then((video) => {
                return FrameGrabber.capture(video).then((posterBlob) => {
                    return {
                        width: video.videoWidth,
                        height: video.videoHeight,
                        duration: Math.round(video.duration * 1000),
                        format: guessFileFormat(url, 'video'),
                        poster: posterBlob,
                    };
                });
            });
        });
    } else {
        return loadVideo(blob).then((video) => {
            return FrameGrabber.capture(video).then((posterBlob) => {
                return {
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: Math.round(video.duration * 1000),
                    format: extractFileFormat(blob.type),
                    poster: posterBlob,
                };
            });
        });
    }
}

/**
 * Obtain duration of audio
 *
 * @param  {Blob|CordovaFile|String} blob
 *
 * @return {Promise<Object>}
 */
function getAudioMetadata(blob) {
    if (typeof(blob) === 'string') {
        let url = blob;
        return BlobManager.fetch(url).then((blob) => {
            return getAudioMetadata(blob);
        }).catch((err) => {
            // we might not be able to fetch the file as a blob
            // due to cross-site restriction
            return loadAudio(url).then((audio) => {
                return {
                    duration: Math.round(audio.duration * 1000),
                    format: guessFileFormat(url, 'image'),
                };
            });
        });
    } else {
        return loadAudio(blob).then((audio) => {
            return {
                duration: Math.round(audio.duration * 1000),
                format: extractFileFormat(blob.type),
            };
        });
    }
}

/**
 * Guess image format based on file extension
 *
 * @param  {String} url
 * @param  {String} category
 *
 * @return {String}
 */
function guessFileFormat(url, category) {
    let ext;
    let m = /\.(\w+)$/.execute(url.replace(/#.*/, '').replace(/\?.*/, ''));
    if (m) {
        ext = _.toLower(m[1]);
        switch (ext) {
            case 'jpg': return 'jpeg';
            default: return ext;
        }
    } else {
        switch (category) {
            case 'image': return 'jpeg';
            case 'video': return 'mp4';
            case 'audio': return 'mp3';
            default: return '';
        }
    }
}

/**
 * Obtain file category from MIME type
 *
 * @param  {String} mimeType
 *
 * @return {String}
 */
function extractFileCategory(mimeType) {
    let parts = _.split(mimeType, '/');
    return _.toLower(parts[0]);
}

/**
 * Obtain file format from MIME type
 *
 * @param  {String} mimeType
 *
 * @return {String}
 */
function extractFileFormat(mimeType) {
    let parts = _.split(mimeType, '/');
    let format = _.toLower(parts[1]);
    switch (format) {
        case 'svg+xml':
            return 'svg';
        default:
            return format;
    }
}

/**
 * Return information about a MediaFile
 *
 * @param  {MediaFile} mediaFile
 *
 * @return {Promise<MediaFileData>}
 */
function getFormatData(mediaFile) {
    return new Promise((resolve, reject) => {
        mediaFile.getFormatData(resolve, reject);
    });
};

export {
    loadImage,
    loadVideo,
    loadAudio,
    loadSVG,
    getImageMetadata,
    getVideoMetadata,
    getAudioMetadata,
    extractFileCategory,
    extractFileFormat,
    getFormatData,
};
