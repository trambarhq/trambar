var Promise = require('bluebird')
var FS = Promise.promisifyAll(require('fs'));
var Request = require('request');
var Crypto = require('crypto');

exports.moveFile = moveFile;
exports.saveFile = saveFile;
exports.hashFile = hashFile;
exports.downloadFile = downloadFile;
exports.preserveFile = preserveFile;
exports.makeTempPath = makeTempPath;

/**
 * Save file to cache folder, using the MD5 hash of its content as name
 *
 * @param  {String} srcPath
 * @param  {String} dstFolder
 *
 * @return {String}
 */
function saveFile(srcPath, dstFolder) {
    return hashFile(srcPath).then((hash) => {
        var dstPath = `${dstFolder}/${hash}`;
        return FS.statAsync(dstPath).catch((err) => {
            return new Promise((resolve, reject) => {
                var inputStream = FS.createReadStream(srcPath);
                var outputStream = FS.createWriteStream(dstPath);
                inputStream.once('error', reject);
                outputStream.once('finish', resolve);
                inputStream.pipe(outputStream);
            });
        }).return(hash);
    });
}

/**
 * Rename a file, deleting it if the destination already exists
 *
 * @param  {String} srcPath
 * @param  {String} dstPath
 *
 * @return {Promise}
 */
function moveFile(srcPath, dstPath) {
    if (srcPath === dstPath) {
        return Promise.resolve();
    }
    return FS.statAsync(dstPath).then(() => {
        // delete if it exists already
        return FS.unlinkAsync(srcPath);
    }).catch(() => {
        return FS.renameAsync(srcPath, dstPath).catch(() => {
            return new Promise((resolve, reject) => {
                var readStream = FS.createReadStream(srcPath);
                var writeStream = FS.createWriteStream(dstPath);
                writeStream.on('error', reject);
                writeStream.on('finish', resolve);
                readStream.on('error', reject);
                readStream.on('close', () => {
                    FS.unlink(srcPath);
                });
                readStream.pipe(writeStream);
            });
        });
    });
}

/**
 * Generate MD5 hash of file contents
 *
 * @param  {String} srcPath
 *
 * @return {Promise<String>}
 */
function hashFile(srcPath) {
    return new Promise((resolve, reject) => {
        var hash = Crypto.createHash('md5');
        var stream = FS.createReadStream(srcPath);
        stream.once('error', reject);
        hash.once('readable', () => {
            resolve(hash.read().toString('hex'));
        });
        stream.pipe(hash);
    });
}

/**
 * Download file file off the Internet
 *
 * @param  {String} url
 * @param  {String} dstFolder
 *
 * @return {Promise<String>}
 */
function downloadFile(url, dstFolder) {
    url = _.replace(url, 'localhost', '172.18.0.1');
    return new Promise((resolve, reject) => {
        var tempPath = makeTempPath(dstFolder, url);
        var writeStream = FS.createWriteStream(tempPath);
        var readStream = Request.get(url);
        writeStream.on('error', reject);
        writeStream.on('finish', () => {
            resolve(tempPath);
        });
        readStream.on('error', reject);
        readStream.pipe(writeStream);
    });
}

/**
 * Preserve user-uploaded file or a file at a URL
 *
 * @param  {File|undefined} file
 * @param  {String|undefined} url
 * @param  {String} dstFolder
 *
 * @return {Promise<Object>}
 */
function preserveFile(file, url, dstFolder) {
    return Promise.try(() => {
        if (file) {
            return file.path;
        } else if (url) {
            return downloadFile(url);
        }
    }).then((srcPath) => {
        if (srcPath) {
            return hashFile(srcPath).then((hash) => {
                var dstPath = `${dstFolder}/${hash}`;
                return moveFile(srcPath, dstPath).then(() => {
                    return {
                        path: dstPath,
                        hash: hash
                    };
                });
            });
        } else {
            return null;
        }
    });
}

/**
 * Generate MD5 hash
 *
 * @param  {String|Buffer} data
 *
 * @return {String}
 */
function md5(data) {
    var hash = Crypto.createHash('md5').update(data);
    return hash.digest('hex');
}

/**
 * Return a temporary path for a URL
 *
 * @param  {String} dstFolder
 * @param  {String} url
 * @param  {String} ext
 *
 * @return {String}
 */
function makeTempPath(dstFolder, url, ext) {
    var date = (new Date).toISOString();
    var hash = md5(`${url} ${date}`);
    if (!ext) {
        ext = '';
    }
    return `${dstFolder}/${hash}${ext}`;
}
