var _ = require('lodash');
var Promise = require('promise');
var FileError = require('errors/file-error');

module.exports = CordovaFile;

function CordovaFile(fullPath, type, size) {
    var name;
    var slashIndex = _.lastIndexOf(fullPath, '/');
    if (slashIndex !== -1) {
        name = decodeURIComponent(fullPath.substr(slashIndex + 1));
    }
    this.fullPath = fullPath;
    this.name = name;
    this.type = type;
    this.size = size;
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

/**
 * Obtain the size of the file
 *
 * @return {Promise}
 */
CordovaFile.prototype.obtainSize = function() {
    return this.getFile().then((file) => {
        this.size = file.size;
    });
};
