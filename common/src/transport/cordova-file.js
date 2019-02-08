import _ from 'lodash';
import FileError from 'errors/file-error';

class CordovaFile {
    constructor(fullPath, type, size) {
        let name;
        if (fullPath.charAt(0) === '/') {
            fullPath = 'file://' + encodeURI(fullPath);
        }
        let slashIndex = _.lastIndexOf(fullPath, '/');
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
    getFileEntry() {
        if (this.fileEntry) {
            return Promise.resolve(this.fileEntry);
        }
        return new Promise((resolve, reject) => {
            resolveLocalFileSystemURL(this.fullPath, (fileEntry) => {
                this.fileEntry = fileEntry;
                resolve(fileEntry);
            }, (errNo) => {
                reject(new FileError(errNo));
            });
        });
    }

    getFile() {
        if (this.file) {
            return Promise.resolve(this.file);
        }
        return this.getFileEntry().then((fileEntry) => {
            return new Promise((resolve, reject) => {
                fileEntry.file((file) => {
                    this.file = file;
                    this.size = file.size;
                    this.type = decodeFileType(file.type);
                    resolve(file);
                }, (errNo) => {
                    reject(new FileError(errNo));
                });
            });
        });
    }

    getArrayBuffer() {
        if (this.arrayBuffer) {
            return Promise.resolve(this.arrayBuffer);
        }
        return this.getFile().then((file) => {
            return new Promise((resolve, reject) => {
                let reader = new FileReader();
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
    }

    /**
     * Obtain the size and mime type of the file
     *
     * @return {Promise}
     */
    obtainMetadata() {
        return this.getFile().return();
    }

    /**
     * Remove the file
     *
     * @return {Promise}
     */
    remove() {
        return this.getFileEntry().then((fileEntry) => {
            return new Promise((resolve, reject) => {
                fileEntry.remove(() => {
                    resolve();
                }, (errNo) => {
                    reject(new FileError(errNo));
                });
            });
        })
    }
}

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

export {
    CordovaFile as default,
    CordovaFile,
};
