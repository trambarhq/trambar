import _ from 'lodash';
import CordovaFile from 'transport/cordova-file';

class Payload {
    constructor(id, destination, type) {
        this.id = id;
        this.destination;
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
        var options;
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
        var part = _.find(this.parts, { name });
        if (!part) {
            throw new Error(`Unable to find part: ${name}`);
        }
        if (part.stream) {
            // options need to be applied to stream
            part.stream.setOptions(options);
        } else {
            part.options = _.assign({}, part.options, options);
        }
    }

    /**
     * Return the oversize of the payload
     *
     * @return {Number}
     */
    getSize() {
        var sizes = _.map(this.parts, (part) => {
            return part.size || 0;
        });
        return _.sum(sizes);
    }

    /**
     * Return the number of bytes uploaded
     *
     * @return {Number}
     */
    getUploaded() {
        var counts = _.map(this.parts, (part) => {
            return part.uploaded || 0;
        });
        return _.sum(counts);
    }

    /**
     * Return the number of files that haven't been fully transferred
     *
     * @return {Number}
     */
    getRemainingFiles() {
        var remainingFiles = _.filter(this.parts, (part) => {
            if (part.size > 0) {
                if (part.uploaded < part.size) {
                    return true;
                }
            }
        });
        return remainingFiles.length;
    }

    /**
     * Return the number of bytes remaining to be uploaded
     *
     * @return {Number}
     */
    getRemainingBytes() {
        var remainingBytes = _.map(this.parts, (part) => {
            return (part.size > 0) ? part.size - part.uploaded : 0;
        });
        return _.sum(remainingBytes);
    }
}

export {
    Payload as default,
    Payload,
};
