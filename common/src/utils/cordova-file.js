var _ = require('lodash');
var Promise = require('promise');
var FileError = require('errors/file-error');

module.exports = CordovaFile;

function CordovaFile(fullPath, type) {
    var name;
    var slashIndex = _.lastIndexOf(fullPath, '/');
    if (slashIndex !== -1) {
        name = decodeURIComponent(fullPath.substr(slashIndex + 1));
    }
    this.fullPath = fullPath;
    this.name = name;
    this.type = type;
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
