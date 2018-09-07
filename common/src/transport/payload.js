import _ from 'lodash';
import BlobManager from 'transport/blob-manager';
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
     * @return {Payload}
     */
    attachFile(file, name) {
        if (!name) {
            name = 'main';
        }
        var url = `payload:${this.token}/${name}`;
        // associate file with payload id so we can find it again
        BlobManager.associate(file, url);

        if (file instanceof Blob) {
            this.parts.push({
                blob: file,
                size: file.size,
                uploaded: 0,
                sent: false,
                name,
            });
        } else if (file instanceof CordovaFile) {
            this.parts.push({
                cordovaFile: file,
                size: file.size,
                uploaded: 0,
                sent: false,
                name
            });
        }
        return this;
    }

    /**
     * Attach a stream to a payload
     *
     * @param  {BlobStream} stream
     * @param  {String|undefined} name
     *
     * @return {Payload}
     */
    attachStream(stream, name) {
        if (!name) {
            name = 'main';
        }
        this.parts.push({
            stream: stream,
            size: stream.size,
            uploaded: stream.transferred,
            sent: false,
            name
        });
        return this;
    }

    /**
     * Attach a URL to a payload
     *
     * @param  {BlobStream} stream
     * @param  {String|undefined} name
     *
     * @return {Payload}
     */
    attachURL(url, name) {
        if (!name) {
            name = 'main';
        }
        this.parts.push({ url, name, sent: false });
        return this;
    }

    /**
     * Attach a part that generated from the main part (or some other part)
     *
     * @param  {String} source
     * @param  {String} name
     *
     * @return {Payload}
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
        this.parts.push({ name, sent: false });
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
