import _ from 'lodash';
import { HTTPError } from '../errors.js';

function fetch(method, url, payload, options) {
  let xhr = new XMLHttpRequest();
  let promise = new Promise((resolve, reject) => {
    let username = _.get(options, 'username', null);
    let password = _.get(options, 'password', null);
    let contentType = _.get(options, 'contentType', null);

    // attach GET letiables to URL
    method = _.toUpper(method);
    if (method === 'GET' && !_.isEmpty(payload)) {
      let pairs = [];
      _.forIn(payload, (value, name) => {
        name = encodeURIComponent(name);
        value = encodeURIComponent(value);
        if (value !== undefined) {
          pairs.push(`${name}=${value}`);
        }
      });
      if (_.indexOf(url, '?') === -1) {
        url += '?';
      } else {
        url += '&';
      }
      url += _.join(pairs, '&');
      payload = null;
    }
    // convert object to string
    if (contentType === 'json') {
      contentType = 'application/json';
    }
    if (contentType === 'application/json' && _.isObject(payload)) {
      payload = JSON.stringify(payload, omitBlob);
    }

    xhr.timeout = _.get(options, 'timeout');
    xhr.withCredentials = _.get(options, 'crossSite', false);
    xhr.responseType = _.get(options, 'responseType', '');
    xhr.attributes = _.get(options, 'attributes');
    if (xhr.attributes) {
      if (xhr.upload) {
        xhr.upload.attributes = xhr.attributes;
      }
    }
    xhr.open(method, url, true, username, password);
    if (contentType) {
      xhr.setRequestHeader("Content-Type", contentType);
    }
    xhr.onload = function(evt) {
      if (xhr.status >= 400) {
        let error = new HTTPError(xhr.status, xhr.response);
        reject(error);
      } else {
        let result = xhr.response;
        resolve(result);
      }
    };
    xhr.ontimeout = function(evt) {
      reject(new Error('Request timed out'));
    };
    xhr.onerror = function(evt) {
      reject(new Error('Unable to connect'));
    };
    xhr.onabort = function(evt) {
      reject(new Error('Transfer aborted: ' + url));
    }
    let onDownloadProgress = _.get(options, 'onDownloadProgress');
    let onUploadProgress = _.get(options, 'onUploadProgress');
    xhr.onprogress = function(evt) {
      if (onDownloadProgress) {
        onDownloadProgress(evt);
      }
    };
    xhr.upload.onprogress = function(evt) {
      if (onUploadProgress) {
        onUploadProgress(evt);
      }
    };
    xhr.send(payload);
  });
  promise.cancel = function() {
    xhr.abort();
  };
  return promise;
}

function omitBlob(key, value) {
  if (value instanceof Blob) {
    return undefined;
  }
  return value;
}

export {
  fetch,
};
