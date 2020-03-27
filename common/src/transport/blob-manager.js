import Moment from 'moment';
import { performHTTPRequest } from './http-request.js';
import { CordovaFile } from './cordova-file.js';

class BlobManager {
  static list = [];

  /**
   * Add a blob to the list
   *
   * @param  {Blob} blob
   */
  static manage(blob) {
    const atime = new Date;
    const entry = this.list.find(e => e.blob === blob);
    if (entry) {
      entry.atime = atime;
      return entry.localURL;
    }
    let localURL;
    if (blob instanceof Blob) {
      localURL = URL.createObjectURL(blob);
    } else if (blob instanceof CordovaFile) {
      localURL = blob.fullPath;
    }
    const urls = [ localURL ];
    this.list.push({ blob, localURL, urls, atime });
    return localURL;
  }

  /**
   * Find a blob that's associated with the given URL
   *
   * @param  {String} url
   *
   * @return {Blob|CordovaFile|null}
   */
  static find(url) {
    if (!url) {
      return null;
    }
    const entry = this.list.find(e => e.urls.includes(url));
    if (!entry) {
      return null;
    }
    entry.atime = new Date;
    return entry.blob;
  }

  /**
   * Associate a blob with a URL
   *
   * @param  {Blob|CordovaFile} target
   * @param  {String} url
   */
  static associate(target, url) {
    if (!target || !url) {
      return;
    }
    let entry = this.list.find(e => e.blob === target);
    if (!entry) {
      this.manage(target);
      entry = this.list.find(e => e.blob === target);
    }
    entry.urls.push(url);
  }

  /**
   * Load a blob from remote location
   *
   * @param  {String} remoteURL
   *
   * @return {Promise<Blob>}
   */
  static async fetch(remoteURL) {
    if (!remoteURL) {
      throw new Error('Invalid argument');
    }
    let blob = this.find(remoteURL);
    if (!blob) {
      const options = { responseType: 'blob' };
      blob = await performHTTPRequest('GET', remoteURL, null, options);
      const localURL = this.manage(blob);
      this.associate(blob, remoteURL);
    }
    return blob;
  }

  /**
   * Release a blob
   *
   * @param  {Blob|CordovaFile} blob
   */
  static release(blob) {
    const index = this.list.findIndex(e => e.blob);
    if (index !== -1) {
      let entry = this.list[index];
      this.list.splice(index, 1);
      releaseEntry(entry);
    }
  }

  /**
   * Clearing blob that have not been touched for some time
   */
  static clean() {
    const now = new Date;
    const removing = [];
    for (let entry of this.list) {
      // see if we can retrieve the file from the server if need arises
      const hasRemote = entry.urls.some(url => /https?:/.test(url));
      if (hasRemote) {
        const elapsed = now - entry.atime;
        if (elapsed > 3 * 60 * 1000) {
          // after five minutes, the blob probably won't be used again
          removing.push(entry);
        }
      }
    }
    for (let entry of removing) {
      releaseEntry(entry);
      this.list.splice(this.list.indexOf(entry), 1);
    }
  }
}

function releaseEntry(entry) {
  if (entry.blob instanceof Blob) {
    URL.revokeObjectURL(entry.localURL);
  } else if (entry.blob instanceof CordovaFile) {
    entry.blob.remove();
  }
};

setInterval(() => {
  BlobManager.clean();
}, 60 * 1000);

export {
  BlobManager,
};
