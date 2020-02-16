import CrossFetch from 'cross-fetch';
import HTTPError from '../common/errors/http-error.mjs';

/**
 * Ask Media Server to import a file at the specified URL
 *
 * @param  {String} url
 * @param  {Object|undefined} retrievalHeaders
 *
 * @return {Promise<Object>}
 */
async function importFile(url, retrievalHeaders) {
  const importURL = 'http://media_server/internal/import';
  const method = 'post';
  const headers = { 'Content-Type': 'application/json' };
  const body = JSON.stringify({ url, headers: retrievalHeaders });
  const response = await CrossFetch(importURL, { method, headers, body, timeout: 5000 });
  const { status } = response;
  const info = await response.json();
  if (status === 200) {
    return info;
  } else {
    throw new HTTPError(status, info.message);
  }
}

export {
  importFile,
};
