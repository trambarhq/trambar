import _ from 'lodash';
import { HTTPError } from '../errors.js';

function performHTTPRequest(method, url, payload, options) {
  if (mockFunc) {
    return mockFunc(method, url, payload, options);
  }

  const {
    username = null,
    password = null,
    contentType = '',
    responseType = '',
    timeout,
    crossSite = false,
    attributes,
    onDownloadProgress,
    onUploadProgress,
  } = options || {};
  const xhr = new XMLHttpRequest();
  const promise = new Promise((resolve, reject) => {
    // attach GET letiables to URL
    method = method.toUpperCase();
    if (method === 'GET' && payload instanceof Object) {
      const pairs = [];
      for (let [ name, value ] of Object.entries(payload)) {
        name = encodeURIComponent(name);
        value = encodeURIComponent(value);
        if (value !== undefined) {
          pairs.push(`${name}=${value}`);
        }
      }
      if (url.indexOf('?') === -1) {
        url += '?';
      } else {
        url += '&';
      }
      url += pairs.join('&');
      payload = null;
    }
    // convert object to string
    const mimeType = (contentType === 'json') ? `application/json` : contentType;
    if (mimeType === 'application/json' && payload instanceof Object) {
      payload = JSON.stringify(payload, (value) => {
        if (value instanceof Blob) {
          return undefined;
        }
        return value;
      });
    }

    xhr.timeout = timeout;
    xhr.withCredentials = crossSite;
    xhr.responseType = responseType;
    xhr.attributes = attributes;
    if (xhr.attributes) {
      if (xhr.upload) {
        xhr.upload.attributes = xhr.attributes;
      }
    }
    xhr.open(method, url, true, username, password);
    if (mimeType) {
      xhr.setRequestHeader('Content-Type', mimeType);
    }
    xhr.onload = function(evt) {
      if (xhr.status >= 400) {
        reject(new HTTPError(xhr.status, xhr.response));
      } else {
        resolve(xhr.response);
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

function mockHTTPRequest(func) {
  mockFunc = func || undefined;
}

let mockFunc = undefined;

export {
  performHTTPRequest,
  mockHTTPRequest,
};
