var Promise = require('promise');
var FileError = require('errors/file-error');

module.exports = CordovaFile;

function CordovaFile(fullPath) {
    this.fullPath = fullPath;
}

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
