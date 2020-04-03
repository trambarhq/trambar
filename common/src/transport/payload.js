import CordovaFile from './cordova-file.js';

class Payload {
  constructor(id, destination, type) {
    this.id = id;
    this.destination = destination;
    this.type = type;
    this.processed = 0;
    this.parts = [];
    this.approved = false;
    this.error = null;
    this.started = false;
    this.paused = false;
    this.sent = false;
    this.failed = false;
    this.canceled = false;
    this.completed = false;
    this.uploadStartTime = null;
    this.uploadEndTime = null;
    this.processEndTime = null;
    this.onAttachment = null;
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
  }

  /**
   * Attach a file to a payload
   *
   * @param  {Blob|CordovaFile} file
   * @param  {String|undefined} name
   *
   * @return {this}
   */
  attachFile(file, name) {
    if (file instanceof Blob) {
      return this.attachPart({
        blob: file,
        size: file.size,
        uploaded: 0,
        sent: false,
        name,
      });
    } else if (file instanceof CordovaFile) {
      return this.attachPart({
        cordovaFile: file,
        size: file.size,
        uploaded: 0,
        sent: false,
        name
      });
    }
  }

  /**
   * Attach a stream to a payload
   *
   * @param  {BlobStream} stream
   * @param  {String|undefined} name
   *
   * @return {this}
   */
  attachStream(stream, name) {
    return this.attachPart({
      stream: stream,
      size: stream.size,
      uploaded: stream.transferred,
      sent: false,
      name
    });
  }

  /**
   * Attach a URL to a payload
   *
   * @param  {BlobStream} stream
   * @param  {String|undefined} name
   *
   * @return {this}
   */
  attachURL(url, name) {
    return this.attachPart({ url, name, sent: false });
  }

  /**
   * Attach a part that generated from the main part (or some other part)
   *
   * @param  {String} source
   * @param  {String} name
   *
   * @return {this}
   */
  attachStep(source, name) {
    // add options to the source part
    let options;
    switch (name) {
      case 'poster':
        options = { generate_poster: true };
        break;
    }
    this.setPartOptions(source, options);
    return this.attachPart({ name, source, sent: false });
  }

  /**
   * Attach a part and trigger event handler
   *
   * @param  {Object} part
   *
   * @return {this}
   */
  attachPart(part) {
    if (!part.name) {
      part.name = 'main';
    }
    this.parts.push(part)
    if (this.onAttachment) {
      this.onAttachment({
        type: 'attachment',
        target: this,
        part,
      });
    }
    return this;
  }

  /**
   * Set options for a part
   *
   * @param  {String} name
   * @param  {Object} options
   */
  setPartOptions(name, options) {
    const part = this.parts.find(p => p.name === name);
    if (!part) {
      throw new Error(`Unable to find part: ${name}`);
    }
    if (part.stream) {
      // options need to be applied to stream
      part.stream.setOptions(options);
    } else {
      part.options = Object.assign({}, part.options, options);
    }
  }

  /**
   * Return the overall size of the payload
   *
   * @return {Number}
   */
  getSize() {
    return this.parts.reduce((sum, p) => sum + (p.size || 0), 0);
  }

  /**
   * Return the number of bytes uploaded
   *
   * @return {Number}
   */
  getUploaded() {
    return this.parts.reduce((sum, p) => sum + (p.uploaded || 0), 0);
  }

  /**
   * Return the number of files that haven't been fully transferred
   *
   * @return {Number}
   */
  getRemainingFiles() {
    const remaining = Object.values(this.parts).filter(p => p.size > 0 && p.uploaded < p.size);
    return remaining.length;
  }

  /**
   * Return the number of bytes remaining to be uploaded
   *
   * @return {Number}
   */
  getRemainingBytes() {
    const remaining = Object.values(this.parts).filter(p => p.size > 0 && p.uploaded < p.size);
    return remaining.reduce((sum, p) => sum + (p.size - p.uploaded), 0);
  }

  /**
   * Cancel a payload
   */
  cancel() {
    for (let part of this.parts) {
      if (part.stream) {
        part.stream.cancel();
      } else if (part.promise && part.promise.cancel) {
        part.promise.cancel();
      }
    }
  }
}

export {
  Payload as default,
  Payload,
};
