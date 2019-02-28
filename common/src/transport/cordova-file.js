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
    async getFileEntry() {
        if (!this.fileEntry) {
            this.fileEntry = await new Promise((resolve, reject) => {
                resolveLocalFileSystemURL(this.fullPath, (fileEntry) => {
                    resolve(fileEntry);
                }, (errNo) => {
                    console.log('resolveLocalFileSystemURL failed')
                    console.log(this.fullPath);
                    reject(new FileError(errNo));
                });
            })
        }
        return this.fileEntry;
    }

    async getFile() {
        if (!this.file) {
            let fileEntry = await this.getFileEntry();
            this.file = await new Promise((resolve, reject) => {
                fileEntry.file((file) => {
                    resolve(file);
                }, (errNo) => {
                    reject(new FileError(errNo));
                });
            });
            this.size = this.file.size;
            this.type = decodeFileType(this.file.type);
        }
        return this.file;
    }

    async getArrayBuffer() {
        if (!this.arrayBuffer) {
            let file = await this.getFile();
            this.arrayBuffer = await new Promise((resolve, reject) => {
                let reader = new FileReader();
                reader.onload = (evt) => {
                    resolve(reader.result);
                };
                reader.onerror = (evt) => {
                    reject(new Error(`Unable to load file`));
                };
                reader.readAsArrayBuffer(file);
            });
        }
        return this.arrayBuffer;
    }

    /**
     * Obtain the size and mime type of the file
     *
     * @return {Promise}
     */
    async obtainMetadata() {
        await this.getFile();
    }

    /**
     * Remove the file
     *
     * @return {Promise}
     */
    async remove() {
        let fileEntry = await this.getFileEntry();
        await new Promise((resolve, reject) => {
            fileEntry.remove(() => {
                resolve();
            }, (errNo) => {
                reject(new FileError(errNo));
            });
        });
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
