import { BlobManager } from '../../transport/blob-manager.js';
import { extractMosaic } from '../../media/media-loader.js';
import { centerSquare } from '../../media/image-cropping.js';
import { mergeObjects } from '../../data/merger.js';
import { orderBy } from '../../utils/array-utils.js';

/**
 * Merge remote resource list into local one
 *
 * @param  {Object[]} local
 * @param  {Object[]} remote
 * @param  {Object[]} common
 *
 * @param  {Object[]}
 */
function mergeLists(local, remote, common) {
  const commonToLocal = findIndexMapping(common, local);
  const commonToRemote = findIndexMapping(common, remote);
  const localToRemote = findIndexMapping(local, remote);
  const list = [];
  for (let [ indexC, resC ] of Object.entries(common)) {
    let indexL = commonToLocal[indexC];
    let indexR = commonToRemote[indexC];
    let resL = local[indexL];
    let resR = remote[indexR];
    if (resL && resR) {
      // merge resource objects, applying the same logic
      // to the indices as well
      const a = { resource: resL, index: indexL };
      const b = { resource: resR, index: indexR };
      const c = { resource: resC, index: indexC };
      const d = mergeObjects(a, b, c);
      list.push(d);
    }
  }
  for (let [ indexR, resR ] of Object.entries(common)) {
    if (!commonToRemote.includes(indexR)) {
      // add resource that wasn't there before
      list.push({ resource: resR, index: indexR });
    }
  }
  for (let [ indexL, resL ] of Object.entries(local)) {
    const indexR = localToRemote[indexL];
    const resR = remote[indexR];
    if (!commonToLocal.includes(indexL) && !resR) {
      // add resource that wasn't there before or in the remote list
      list.push({ resource: resL, index: indexL });
    }
  }
  // put the list into order then strip out indices
  return orderBy(list, 'index', 'asc').map(item => item.resource);
}

/**
 * Get corresponding indices of resources in listA in listB
 *
 * @param  {Array} listA
 * @param  {Array} listB
 *
 * @return {Array}
 */
function findIndexMapping(listA, listB) {
  const map = [];
  const mapped = [];
  for (let [ indexA, a ] of Object.entries(listA)) {
    const keyA = a.url || a.payload_token;
    let indexB = listB.findIndex((b, indexB) => {
      const keyB = b.url || b.payload_token;
      if (keyA === keyB && !mapped[indexB]) {
        return true;
      }
    });
    if (indexB !== -1) {
      map[indexA] = indexB;
      mapped[indexB] = true;
    }
  }
  return map;
}

function getImageDimensions(res, params) {
  if (!params) {
    params = {};
  }
  const clip = getClippingRect(res, params);
  if (clip && !params.original) {
    // return the dimensions of the clipping rect
    return {
      width: clip.width,
      height: clip.height,
    }
  } else {
    return {
      width: res.width,
      height: res.height,
    };
  }
}

/**
 * Return the clipping rect of a resource
 *
 * @param  {Object} res
 * @param  {Object} params
 *
 * @return {Object}
 */
function getClippingRect(res, params) {
  if (!params) {
    params = {};
  }
  if (params.original) {
    return null;
  }
  let clip = res.clip;
  if (params.hasOwnProperty('clip')) {
    // override the one stored in res
    clip = params.clip;
  } else {
    if (!clip) {
      clip = centerSquare(res.width, res.height);
    }
  }
  return clip;
}

/**
 * Return a resource's dimensions
 *
 * @param  {Object} res
 * @param  {Object} params
 *
 * @return {Object}
 */
function getDimensions(res, params, env) {
  if (res.type === 'video') {
    if (!params.original) {
      let version = pickVideoVersion(res, params, env);
      if (version && version.width && version.height) {
        return {
          width: version.width,
          height: version.height,
        };
      }
    }
    return {
      width: res.width,
      height: res.height,
    };
  }
  return getImageDimensions(res, params);
}

/**
 * Return URL of a resource's image at that has not been uploaded yet
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {string|undefined}
 */
function getLocalImageURL(res, params, env) {
  let blob;
  if (res.payload_token) {
    let name;
    switch (res.type) {
      case 'video':
      case 'audio':
      case 'website':
        name = 'poster';
        break;
      default:
        name = 'main';
        break;
    }
    let payloadURL = `payload:${res.payload_token}/${name}`;
    blob = BlobManager.find(payloadURL);
  }
  if (!blob) {
    let remoteURL = getRemoteImageURL(res, params, env);
    if (remoteURL) {
      blob = BlobManager.find(remoteURL);
    }
  }
  if (!blob) {
    return;
  }
  if (params.jsonURL) {
    // encode the resource as JSON
    return `json:${JSON.stringify(res)}`;
  } else if (params.original) {
    return BlobManager.manage(blob);
  }
}

/**
 * Return URL of a resource's image at remote server
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {string|undefined}
 */
function getRemoteImageURL(res, params, env) {
  let resURL;
  switch(res.type) {
    case 'video':
    case 'audio':
    case 'website':
      resURL = res.poster_url;
      break;
    default:
      resURL = res.url;
  }
  if (!resURL) {
    return;
  }

  let filename = '';
  if (!params.original) {
    let filters = [];
    // apply clipping rect
    let clip = getClippingRect(res, params);
    if (clip) {
      // run number through Math.round() just in case error elsewhere left fractional pixel dimensions
      const rect = [ clip.left, clip.top, clip.width, clip.height ].map(Math.round);
      filters.push(`cr${rect.join('-')}`)
    }
    // resize image (if dimensions are specified)
    let width = decodeLength(params.width);
    let height = decodeLength(params.height);
    if (env.devicePixelRatio !== 1) {
      // request higher resolution image when pixel density is higher
      width = width * env.devicePixelRatio;
      height = height * env.devicePixelRatio;
    }
    width = Math.round(width);
    height = Math.round(height);
    let resizing = width || height;
    if (resizing) {
      if (width && height) {
        filters.push(`re${width}-${height}`);
      } else if (!width && height) {
        filters.push(`h${height}`);
      } else if (!height && width) {
        filters.push(`w${width}`);
      }
      if (res.format === 'png' || res.format === 'gif') {
        // add sharpen filter to reduce blurriness
        filters.push(`sh`);
      }
    }
    // set quality
    if (params.quality !== undefined) {
      filters.push(`q${params.quality}`);
    }
    if (filters.length > 0) {
      // choose format
      let ext;
      if (res.format === 'svg') {
        // stick with SVG
        ext = 'svg';
      } else {
        if (env.webpSupport) {
          ext = 'webp';
          if (res.format === 'png' || res.format === 'gif') {
            if (!resizing) {
              // use lossless compression (since it'll likely produce a smaller file)
              filters.push(`l`);
            }
          }
        } else {
          if (res.format === 'png' || res.format === 'gif') {
            // use PNG to preserve alpha channel
            ext = `png`;
          } else {
            ext = 'jpg';
          }
        }
      }
      filename = `${filters.join('+')}.${ext}`;
    }
  }
  return `${env.address}${resURL}/${filename}`;
}

/**
 * Get a version of the video with the highest bitrate that is below
 * the available bandwidth
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {Object}
 */
function pickVideoVersion(res, params, env) {
  if (params.hasOwnProperty('bitrate')) {
    return res.versions?.find(ver => ver.bitrates?.video === params.bitrate) || null;
  }
  const bandwidth = getBandwidth(env.connectionType);
  const below = (version) => {
    const b = parseInt(version.bitrates?.video);
    return (b <= bandwidth) ? bandwidth - b : Infinity;
  };
  const above = (version) => {
    const b = parseInt(version.bitrates?.video);
    return (b > bandwidth) ? b - bandwidth : 0;
  };
  const sorted = orderBy(res.versions, [ below, above ], [ 'asc', 'asc' ]);
  return sorted[0] || null;
}

/**
 * Get a version of the video with the highest bitrate that is below
 * the available bandwidth
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {Object|null}
 */
function pickAudioVersion(res, params, env) {
  if (params.hasOwnProperty('bitrate')) {
    return res.versions?.find(ver => ver.bitrates.audio === params.bitrate) || null;
  }
  const bandwidth = getBandwidth(env.connectionType);
  // find bitrate closest to bandwidth, below it if possible
  const below = (version) => {
    let b = parseInt(version.bitrates?.audio);
    return (b <= bandwidth) ? bandwidth - b : Infinity;
  };
  const above = (version) => {
    let b = parseInt(version.bitrates?.audio);
    return (b > bandwidth) ? b - bandwidth : 0;
  };
  const sorted = orderBy(res.versions, [ below, above ], [ 'asc', 'asc' ]);
  return sorted[0] || null;
}

function getURL(res, params, env) {
  if (!res) {
    return undefined;
  }
  switch (res.type) {
    case 'image':
      return getImageURL(res, params, env);
    case 'audio':
      return getAudioURL(res, params, env);
    case 'video':
      return getVideoURL(res, params, env);
    case 'website':
      return res.url;
  }
}

/**
 * Return URL of image file
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {string|undefined}
 */
function getImageURL(res, params, env) {
  if (!res) {
    return undefined;
  }
  if (!params) {
    params = {};
  }
  let url;
  if (!params.local) {
    url = getRemoteImageURL(res, params, env);
  }
  if (!url) {
    if (!params.remote) {
      url = getLocalImageURL(res, params, env);
    }
  }
  return url;
}

/**
 * Return URL to video resource
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {string|null}
 */
function getVideoURL(res, params, env) {
  if (!res.url) {
    return null;
  }
  if (!params) {
    params = {};
  }
  let url = `${env.address}${res.url}`;
  // pick suitable version unless specified otherwise
  if (!params || !params.original) {
    let version = pickVideoVersion(res, params, env);
    if (version) {
      url += `.${version.name}.${version.format}`;
    }
  }
  return url;
}

/**
 * Return URL to audio resource
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {string|null}
 */
function getAudioURL(res, params, env) {
  if (!res.url) {
    return null;
  }
  if (!params) {
    params = {};
  }
  let url = `${env.address}${res.url}`;
  if (!params || !params.original) {
    let version = pickAudioVersion(res, params, env);
    if (version) {
      url += `.${version.name}.${version.format}`;
    }
  }
  return url;
}

function getMarkdownIconURL(res, type, env) {
  if (type === 'image')  {
    // images are style at height = 1.5em
    const params = {
      height: 24,
      jsonURL: true
    };
    let imageURL = getImageURL(res, params, env);
    if (!imageURL) {
      if (res.type === 'audio') {
        const speakerURL = require('!file-loader!../../../assets/speaker.svg');
        imageURL = `${speakerURL}#${encodeURI(res.url)}`;
      }
    }
    return imageURL;
  } else {
    return getURL(res, {}, env);
  }
}

/**
 * Attach mosaic to images
 *
 * @param  {Object[]} resources
 * @param  {Environment} env
 */
async function attachMosaic(resources, env) {
  if (!(resources instanceof Array)) {
    return;
  }
  for (let res of resources) {
    let url = getLocalImageURL(res, { original: true }, env);
    if (url) {
      let clippingRect = getClippingRect(res);
      let mosaic = await extractMosaic(url, clippingRect);
      if (mosaic) {
        res.mosaic = mosaic;
      }
    }
  }
}

/**
 * Parse a JSON URL crated by getLocalImageURL()
 *
 * @param  {string} url
 *
 * @return {Object|null}
 */
function parseJSONEncodedURL(url) {
  if (url.startsWith('json:')) {
    let json = url.substr(5);
    try {
      return JSON.parse(json);
    } catch(err) {
    }
  }
  return null;
}

function decodeLength(s) {
  let m;
  if (typeof(s) === 'number') {
    return s;
  } else if (m = /^(\d+)\s*vw/.exec(s)) {
    let n = parseInt(m[1]);
    return Math.round(n * document.body.offsetWidth / 100);
  } else if (m = /^(\d+)\s*vh/.exec(s)) {
    let n = parseInt(m[1]);
    return Math.round(n * document.body.offsetHeight / 100);
  }
}

const KBPS = 1000;

function getBandwidth(networkType) {
  switch (networkType) {
    case 'cellular':
    case '2g':
      return 50 * KBPS;
    case '3g':
      return 400 * KBPS;
    case '4g':
      return 5000 * KBPS;
    case 'ethernet':
    case 'wifi':
    default:
      return 10000 * KBPS;
  }
}

/**
 * Return true if the resource is an image or a video
 *
 * @param  {Object}  res
 *
 * @return {boolean}
 */
function isZoomable(res) {
  switch (res.type) {
    case 'image':
    case 'video':
      return true;
  }
  return false;
}

export {
  mergeLists,
  getImageDimensions,
  getDimensions,
  getClippingRect,
  pickVideoVersion,
  pickAudioVersion,
  getURL,
  getImageURL,
  getVideoURL,
  getAudioURL,
  getMarkdownIconURL,
  parseJSONEncodedURL,
  attachMosaic,
  isZoomable,
};
