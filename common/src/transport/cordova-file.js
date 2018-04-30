var _ = require('lodash');
var Promise = require('bluebird');
var FileError = require('errors/file-error');

module.exports = CordovaFile;

function CordovaFile(fullPath, type, size) {
    var name;
    if (fullPath.charAt(0) === '/') {
        fullPath = 'file://' + encodeURI(fullPath);
    }
    var slashIndex = _.lastIndexOf(fullPath, '/');
    if (slashIndex !== -1) {
        name = decodeURI(fullPath.substr(slashIndex + 1));
    }
    this.fullPath = fullPath;
    this.name = name;
    this.type = type;
    this.size = size;

    this.fileEntry = null;
    this.file = null;
    this.arrayBuffer = null;
}

/**
 * Get the FileEntry object
 *
 * @return {Promise<FileEntry>}
 */
CordovaFile.prototype.getFileEntry = function() {
    if (this.fileEntry) {
        return Promise.resolve(this.fileEntry);
    }
    return new Promise((resolve, reject) => {
        resolveLocalFileSystemURL(this.fullPath, (fileEntry) => {
            this.fileEntry = fileEntry;
            resolve(fileEntry);
        }, (err) => {
            reject(new FileError(err));
        });
    });
};

CordovaFile.prototype.getFile = function() {
    if (this.file) {
        return Promise.resolve(this.file);
    }
    return this.getFileEntry().then((fileEntry) => {
        return new Promise((resolve, reject) => {
            fileEntry.file((file) => {
                this.file = file;
                resolve(file);
            }, (err) => {
                reject(new FileError(err));
            });
        });
    });
};

CordovaFile.prototype.getArrayBuffer = function() {
    if (this.arrayBuffer) {
        return Promise.resolve(this.arrayBuffer);
    }
    return this.getFile().then((file) => {
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = (evt) => {
                this.arrayBuffer = reader.result;
                resolve(reader.result);
            };
            reader.onerror = (evt) => {
                reject(new Error(`Unable to load file`));
            };
            reader.readAsArrayBuffer(file);
        });
    });
};

/**
 * Obtain the size and mime type of the file
 *
 * @return {Promise}
 */
CordovaFile.prototype.obtainMetadata = function() {
    return this.getFile().then((file) => {
        this.size = file.size;
        this.type = decodeFileType(file.type);
    });
};

function decodeFileType(type) {
    // on Windows we'll get a file extension instead of a mime type
    if (type && type.charAt(0) === '.') {
        switch (_.toLower(type)) {
            case '.jpg':
            case '.jpeg': return 'image/jpeg';
            case '.png': return 'image/png';
            case '.gif': return 'image/gif';
            case '.mp4': return 'video/mp4';
            case '.mp3': return 'audio/mp3';
            default: return 'application/octet-stream';
        }
    }
    return type;
}
