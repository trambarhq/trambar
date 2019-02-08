import _ from 'lodash';
import Bluebird from 'bluebird'
import FS from 'fs'; Bluebird.promisifyAll(FS);
import Request from 'request';
import Crypto from 'crypto';

/**
 * Save file to cache folder, using the MD5 hash of its content as name
 *
 * @param  {String} srcPath
 * @param  {String} dstFolder
 *
 * @return {String}
 */
async function saveFile(srcPath, dstFolder) {
    let hash = await hashFile(srcPath);
    try {
        await FS.statAsync(dstPath);
    } catch (err) {
        let inputStream = FS.createReadStream(srcPath);
        let outputStream = FS.createWriteStream(dstPath);
        await new Promise((resolve, reject) => {
            inputStream.once('error', reject);
            outputStream.once('finish', resolve);
            inputStream.pipe(outputStream);
        });
    }
    return hash;
}

/**
 * Rename a file, deleting it if the destination already exists
 *
 * @param  {String} srcPath
 * @param  {String} dstPath
 *
 * @return {Promise}
 */
async function moveFile(srcPath, dstPath) {
    if (srcPath === dstPath) {
        return;
    }
    try {
        // delete source file if dest file exists already
        await FS.statAsync(dstPath);
        await FS.unlinkAsync(srcPath);
    } catch (err) {
        try {
            await FS.renameAsync(srcPath, dstPath);
        } catch (err) {
            // can't rename accross volumes
            let readStream = FS.createReadStream(srcPath);
            let writeStream = FS.createWriteStream(dstPath);
            await new Promise((resolve, reject) => {
                writeStream.once('error', reject);
                writeStream.once('finish', resolve);
                readStream.once('error', reject);
                readStream.once('close', async () => {
                    await FS.unlinkAsync(srcPath);
                });
                readStream.pipe(writeStream);
            });
        }
    }
}

/**
 * Generate MD5 hash of file contents
 *
 * @param  {String} srcPath
 *
 * @return {Promise<String>}
 */
async function hashFile(srcPath) {
    let hash = Crypto.createHash('md5');
    let stream = FS.createReadStream(srcPath);
    await new Promise((resolve, reject) => {
        stream.once('error', reject);
        hash.once('readable', resolve);
        stream.pipe(hash);
    });
    return hash.read().toString('hex');
}


/**
 * Download file file off the Internet
 *
 * @param  {String} url
 * @param  {String} dstFolder
 *
 * @return {Promise<String>}
 */
async function downloadFile(url, dstFolder) {
    let tempPath = makeTempPath(dstFolder, url);
    let writeStream = FS.createWriteStream(tempPath);
    let readStream = Request.get(url);
    await new Promise((resolve, reject) => {
        writeStream.once('error', reject);
        writeStream.once('finish', resolve);
        readStream.once('error', reject);
        readStream.pipe(writeStream);
    });
    return tempPath;
}

/**
 * Preserve user-uploaded file or a file at a URL
 *
 * @param  {File|undefined} file
 * @param  {String|undefined} url
 * @param  {String} dstFolder
 *
 * @return {Promise<String>}
 */
async function preserveFile(file, url, dstFolder) {
    let srcPath;
    if (file) {
        srcPath = file.path;
    } else if (url) {
        srcPath = await downloadFile(url, dstFolder);
    }
    if (!srcPath) {
        return null;
    }
    let hash = await hashFile(srcPath);
    let dstPath = `${dstFolder}/${hash}`;
    await moveFile(srcPath, dstPath);
    return dstPath;
}

/**
 * Generate MD5 hash
 *
 * @param  {String|Buffer} data
 *
 * @return {String}
 */
function md5(data) {
    let hash = Crypto.createHash('md5').update(data);
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
    let date = (new Date).toISOString();
    let hash = md5(`${url} ${date}`);
    if (!ext) {
        ext = '';
    }
    return `${dstFolder}/${hash}${ext}`;
}

export {
    moveFile,
    saveFile,
    hashFile,
    downloadFile,
    preserveFile,
    makeTempPath,
};
