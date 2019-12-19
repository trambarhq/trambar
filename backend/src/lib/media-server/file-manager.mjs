import _ from 'lodash';
import Bluebird from 'bluebird'
import FS from 'fs'; Bluebird.promisifyAll(FS);
import CrossFetch from 'cross-fetch';
import Crypto from 'crypto';
import { PassThrough } from 'stream';
import HTTPError from '../common/errors/http-error.mjs';

/**
 * Save file to cache folder, using the MD5 hash of its content as name
 *
 * @param  {String} srcPath
 * @param  {String} dstFolder
 *
 * @return {String}
 */
async function saveFile(srcPath, dstFolder) {
    const hash = await hashFile(srcPath);
    try {
        await FS.statAsync(dstPath);
    } catch (err) {
        const inputStream = FS.createReadStream(srcPath);
        const outputStream = FS.createWriteStream(dstPath);
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
            const readStream = FS.createReadStream(srcPath);
            const writeStream = FS.createWriteStream(dstPath);
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
    const hash = Crypto.createHash('md5');
    const stream = FS.createReadStream(srcPath);
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
 * @param  {Object} source
 * @param  {String} dstFolder
 *
 * @return {Promise<String>}
 */
async function downloadFile(source, dstFolder) {
    const { url, headers: additionalHeaders } = source;
    const previousDownload = await recallDownload(url, dstFolder);
    const headers = { ...additionalHeaders };
    if (previousDownload) {
        if (previousDownload.etag) {
            headers['If-None-Match'] = previousDownload.etag;
        } else if (previousDownload.mtime) {
            headers['If-Modified-Since'] = previousDownload.mtime;
        }
    }
    const response = await CrossFetch(url, { headers, timeout: 2500 });
    const { status } = response;
    if (status === 200) {
        // stream contents into temp file
        const tempPath = makeTempPath(dstFolder, source.url);
        const tempFile = FS.createWriteStream(tempPath);
        const tempFilePromise = new Promise((resolve, reject) => {
            tempFile.once('finish', resolve);
            tempFile.once('error', reject);
        });
        //  calculate the MD5 hash at the same time
        const md5Hash = Crypto.createHash('md5');
        const md5HashPromise = new Promise((resolve, reject) => {
            md5Hash.once('readable', resolve);
            md5Hash.once('error', reject);
        });
        const passThru = new PassThrough;
        passThru.pipe(md5Hash);
        passThru.pipe(tempFile);
        response.body.pipe(passThru);
        await Promise.all([ tempFilePromise, md5HashPromise ]);

        // rename file to its MD5 hash
        const hash = md5Hash.read().toString('hex');
        const dstPath = `${dstFolder}/${hash}`;
        await moveFile(tempPath, dstPath);
        await rememberDownload(url, dstFolder, hash, response.headers);
        return dstPath;
    } else if (status === 204) {
        return null;
    } else if (status === 304) {
        return previousDownload.path;
    } else if (status >= 400) {
        throw new HTTPError(status);
    }
}

/**
 * Preserve user-uploaded file or a file at a URL
 *
 * @param  {Object} source
 * @param  {String} dstFolder
 * @param  {TaskLog|null} taskLog
 *
 * @return {Promise<String|null>}
 */
async function preserveFile(source, dstFolder, taskLog) {
    if (source.file) {
        const srcPath = source.file.path;
        const hash = await hashFile(srcPath);
        const dstPath = `${dstFolder}/${hash}`;
        await moveFile(srcPath, dstPath);
        return dstPath;
    } else if (source.url) {
        if (taskLog) {
            taskLog.describe(`downloading ${source.url}`);
        }
        return downloadFile(source, dstFolder);
    }
    return null;
}

/**
 * Generate MD5 hash
 *
 * @param  {String|Buffer} data
 *
 * @return {String}
 */
function md5(data) {
    const hash = Crypto.createHash('md5').update(data);
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
    const date = (new Date).toISOString();
    const hash = md5(`${url} ${date}`);
    if (!ext) {
        ext = '';
    }
    return `${dstFolder}/${hash}${ext}`;
}

/**
 * Save information about a downloaded file
 *
 * @param  {String} url
 * @param  {String} dstFolder
 * @param  {String} hash
 * @param  {Object<String>} headers
 *
 * @return {Promise}
 */
async function rememberDownload(url, dstFolder, hash, headers) {
    const etag = headers.get('etag');
    const mtime = headers.get('last-modified');
    const type = headers.get('content-type');
    const size = parseInt(headers.get('content-length'));
    const info = { url, hash, type, size, etag, mtime };
    const json = JSON.stringify(info, undefined, 2);
    const folder = `${dstFolder}/.url`;
    try {
        await FS.statAsync(folder);
    } catch (err) {
        await FS.mkdirAsync(folder);
    }
    const urlHash = md5(url);
    const path = `${dstFolder}/.url/${urlHash}`;
    return FS.writeFileAsync(path, json);
}

/**
 * Retrieve saved information about a previous download (if any)
 *
 * @param  {String} url
 * @param  {String} dstFolder
 *
 * @return {Promise<Object|undefined>}
 */
async function recallDownload(url, dstFolder) {
    try {
        const urlHash = md5(url);
        const path = `${dstFolder}/.url/${urlHash}`;
        const json = await FS.readFileAsync(path, 'utf-8');
        const info = JSON.parse(json);
        info.path = `${dstFolder}/${info.hash}`;

        // verify that the file is there
        if (info.size !== undefined) {
            const stats = await FS.statAsync(info.path);
            if (info.size !== stats.size) {
                if (typeof(info.size) === 'number') {
                    throw new Error('Size mismatch');
                }
            }
        }
        return info;
    } catch (err) {
    }
}

export {
    moveFile,
    saveFile,
    hashFile,
    downloadFile,
    preserveFile,
    makeTempPath,
};
