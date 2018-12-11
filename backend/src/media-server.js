import _ from 'lodash';
import Promise from 'bluebird';
import FS from 'fs'; Promise.promisifyAll(FS);
import Path from 'path';
import Express from 'express';
import CORS from 'cors';
import BodyParser from 'body-parser';
import Multer from 'multer';
import Moment from 'moment';
import DNSCache from 'dnscache';
import FileType from 'file-type';

import Database from 'database';
import Task from 'accessors/task';
import HTTPError from 'errors/http-error';
import * as Shutdown from 'shutdown';

import * as CacheFolders from 'media-server/cache-folders';
import * as FileManager from 'media-server/file-manager';
import * as ImageManager from 'media-server/image-manager';
import * as VideoManager from 'media-server/video-manager';
import * as StockPhotoImporter from 'media-server/stock-photo-importer';

let server;
let cacheControl = {
    image: 'max-age=2592000, immutable',
    video: 'max-age=86400',
    audio: 'max-age=86400',
};

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

async function start() {
    // make sure cache folders exist and stock photos are linked
    await CacheFolders.create();
    await StockPhotoImporter.importPhotos();

    // start up Express
    let app = Express();
    let upload = Multer({ dest: '/var/tmp' });
    app.use(CORS());
    app.use(BodyParser.json());
    app.set('json spaces', 2);
    app.get('/srv/media/images/:filename/original/:alias', handleImageOriginalRequest);
    app.get('/srv/media/images/:hash/:filename', handleImageFiltersRequest);
    app.get('/srv/media/images/:filename', handleImageOriginalRequest);
    app.get('/srv/media/videos/:filename/original/:alias', handleVideoRequest);
    app.get('/srv/media/videos/:filename', handleVideoRequest);
    app.get('/srv/media/audios/:filename/original/:alias', handleAudioRequest);
    app.get('/srv/media/audios/:filename', handleAudioRequest);
    app.get('/srv/media/cliparts/:filename', handleClipartRequest);
    app.post('/srv/media/images/upload/:schema/', upload.single('file'), handleImageUpload);
    app.post('/srv/media/videos/upload/:schema/', upload.single('file'), handleVideoUpload);
    app.post('/srv/media/videos/poster/:schema/', upload.single('file'), handleVideoPoster);
    app.post('/srv/media/audios/upload/:schema/', upload.single('file'), handleAudioUpload);
    app.post('/srv/media/audios/poster/:schema/', upload.single('file'), handleAudioPoster);
    app.post('/srv/media/stream/', upload.single('file'), handleStream);
    app.post('/srv/internal/import', upload.single('file'), handleImageImport);
    await new Promise((resolve, reject) => {
        server = app.listen(80, () => {
            resolve();
            reject = null;
        });
        server.once('error', (evt) => {
            if (reject) {
                reject(new Error(evt.message));
            }
        })
    });
}

async function stop() {
    await Shutdown.close(server);
}

/**
 * Send a JSON object to browser
 *
 * @param  {Response} res
 * @param  {Object} result
 */
function sendJSON(res, result) {
    res.json(result);
}

/**
 * Send binary data to browser
 *
 * @param  {Response} res
 * @param  {Buffer} buffer
 * @param  {String} mimeType
 * @param  {String|undefined} cc
 */
function sendFile(res, buffer, mimeType, cc) {
    res.type(mimeType)
    if (cc) {
        res.set('Cache-Control', cc);
    }
    res.send(buffer);
}

/**
 * Send static file to browser
 *
 * @param  {Response} res
 * @param  {String} path
 * @param  {String|undefined} cc
 * @param  {String|undefined} filename
 *
 * @return {Promise}
 */
async function sendStaticFile(res, path, cc, filename) {
    let info = await getFileType(path);
    res.type(info.mime);
    if (cc) {
        res.set('Cache-Control', cc);
    }
    if (filename) {
        res.set('Content-disposition', `attachment; filename=${filename}`);
    }
    try {
        let stat = await FS.lstatAsync(path);
        if (stat.isSymbolicLink()) {
            // serve file through Express if it's a symlink, since it's probably
            // pointing to a file that only exist in this Docker container
            res.sendFile(path);
        } else {
            // ask Nginx to server the file
            let relPath = path.substr(CacheFolders.root.length + 1);
            let uri = `/srv/static_media/${relPath}`;
            res.set('X-Accel-Redirect', uri).end();
        }
    } catch (err) {
        sendError(res, new HTTPError(404));
    }
}

/**
 * Send error to browser as JSON object
 *
 * @param  {Response} res
 * @param  {Object} err
 */
function sendError(res, err) {
    let statusCode = err.statusCode;
    let message = err.message;
    if (!statusCode) {
        // not an expected error
        statusCode = 500;
        if (process.env.NODE_ENV === 'production') {
            message = 'Internal server error';
        }
    }
    res.status(statusCode).json({ message });
}

/**
 * Handle image request that makes use of filters
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleImageFiltersRequest(req, res) {
    try {
        let hash = req.params.hash;
        let filename = req.params.filename;
        var m = /([^.]*?)(\.(.+))?$/i.exec(filename);
        if (!m) {
            throw new HTTPError(400, 'Invalid filename');
        }
        let filters = m[1], format = m[3];
        if (!format || format === 'jpg') {
            format = 'jpeg';
        }
        let path = `${CacheFolders.image}/${hash}`;
        let buffer = await ImageManager.applyFilters(path, filters, format);
        sendFile(res, buffer, format, cacheControl.image);
    } catch (err) {
        sendError(res, err);
    }
}

/**
 * Handle request of original images
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleImageOriginalRequest(req, res) {
    let path = `${CacheFolders.image}/${req.params.filename}`;
    await sendStaticFile(res, path, cacheControl.video);
}

/**
 * Handle video request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleVideoRequest(req, res) {
    let path = `${CacheFolders.video}/${req.params.filename}`;
    await sendStaticFile(res, path, cacheControl.video);
}

/**
 * Handle audio request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleAudioRequest(req, res) {
    let path = `${CacheFolders.audio}/${req.params.filename}`;
    await sendStaticFile(res, path, cacheControl.audio);
}

/**
 * Handle clipart request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleClipartRequest(req, res) {
    try {
        let path = Path.resolve(`../media/cliparts/${req.params.filename}`);
        let info = await getFileType(path);
        res.type(info.mime);
        res.set('Cache-Control', 'max-age=86400');
        res.sendFile(path);
    } catch (err) {
        sendError(res, new HTTPError(404));
    }
}

/**
 * Handle image upload, either attached file or a URL
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleImageUpload(req, res) {
    try {
        let schema = req.params.schema;
        let token = req.query.token;
        let file = req.file;
        let sourceURL = req.body.url;
        let taskID = await checkTaskToken(schema, token, 'add-image');
        let imagePath = await FileManager.preserveFile(file, sourceURL, CacheFolders.image);
        if (!imagePath) {
            throw new HTTPError(400);
        }

        // save image metadata into the task object
        // a PostgreSQL stored-proc will then transfer that into objects
        // that contains the token
        let metadata = ImageManager.getImageMetadata(imagePath);
        let url = getFileURL(imagePath);
        let details = {
            url: url,
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            title: metadata.title,
        };
        await saveTaskOutcome(schema, taskID, 'main', details);

        let result = { url };
        sendJSON(res, result);
    } catch (err) {
        sendError(res, err);
    }
}

/**
 * Handle internal image import request from other part of system
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleImageImport(req, res) {
    try {
        let file = req.file;
        let url = req.body.url;
        let imagePath = await FileManager.preserveFile(file, url, CacheFolders.image);
        if (!imagePath) {
            throw new HTTPError(400);
        }

        let metadata = await ImageManager.getImageMetadata(imagePath);
        let result = {
            type: 'image',
            url: getFileURL(imagePath),
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
        };
        sendJSON(res, result);
    } catch (err) {
        sendError(res, err);
    }
}

/**
 * Handle video upload
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleVideoUpload(req, res) {
    return handleMediaUpload(req, res, 'video');
}

/**
 * Handle video poster
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleVideoPoster(req, res) {
    return handleMediaPoster(req, res, 'video');
}

/**
 * Handle audio upload
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleAudioUpload(req, res) {
    return handleMediaUpload(req, res, 'audio');
}

/**
 * Handle audio upload
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleAudioPoster(req, res) {
    return handleMediaPoster(req, res, 'audio');
}

/**
 * Handle video or audio upload, either as attached file, a URL, or a stream
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleMediaUpload(req, res, type) {
    try {
        let schema = req.params.schema;
        let token = req.query.token;
        let streamID = req.body.stream;
        let file = req.file;
        let url = req.body.url;
        let generatePoster = !!req.body.generate_poster;
        let taskID = await checkTaskToken(schema, token, `add-${type}`);
        let result;

        if (streamID) {
            // handle streaming upload--transcoding job has been created already
            let job = VideoManager.findTranscodingJob(streamID);
            if (!job) {
                throw new HTTPError(404);
            }
            monitorTranscodingJob(schema, taskID, job);
            result = {};
        } else {
            // transcode an uploaded file--move it into cache folder first
            let dstFolder = CacheFolders[type];
            let mediaPath = await FileManager.preserveFile(file, url, dstFolder);
            if (!mediaPath) {
                throw new HTTPError(400);
            }

            let url = getFileURL(mediaPath);
            // create the transcoding job, checking if it exists already on
            // the off-chance the same file is uploaded twice at the same time
            var jobID = Path.basename(mediaPath);
            if (!VideoManager.findTranscodingJob(jobID)) {
                let job = await VideoManager.startTranscodingJob(mediaPath, type, jobID);
                if (generatePoster) {
                    await VideoManager.requestPosterGeneration(job);
                }
                monitorTranscodingJob(schema, taskID, job);
            }
            result = { url };
        }
        sendJSON(res, result);
    } catch (err) {
        sendError(res, err);
    }
}

/**
 * Monitor a transcoding job, saving progress into a task object
 *
 * @param  {String} schema
 * @param  {Number} taskID
 * @param  {Object} job
 */
function monitorTranscodingJob(schema, taskID, job) {
    // monitor transcoding progress
    job.onProgress = (evt) => {
        var progress = evt.target.progress;
        console.log('Progress: ', progress + '%');
        saveTaskProgress(schema, taskID, progress);
    };

    // wait for transcoding to finish
    let monitorMedia = async () => {
        await VideoManager.awaitTranscodingJob(job);
        if (job.aborted) {
            return;
        }
        // save URL and information about available version to task object
        // (doing so transfer these properties into details.resources of
        // object that has the Task object's token as payload_token)
        let details = {
            url: getFileURL(job.inputFile.path),
            duration: job.inputFile.duration,
            width: job.inputFile.width,
            height: job.inputFile.height,
            bitrates: {
                video: job.inputFile.videoBitrate,
                audio: job.inputFile.audioBitrate,
            },
            versions: _.map(job.outputFiles, (outputFile) => {
                return {
                    name: outputFile.name,
                    width: outputFile.width,
                    height: outputFile.height,
                    bitrates: {
                        video: outputFile.videoBitrate,
                        audio: outputFile.audioBitrate,
                    },
                    format: outputFile.format,
                };
            }),
        };
        await saveTaskOutcome(schema, taskID, 'main', details);
    };
    // wait for poster to be generated
    let monitorPoster = async () => {
        if (job.posterFile) {
            await VideoManager.awaitPosterGeneration(job);
            if (job.aborted) {
                return;
            }
            let details = {
                poster_url: getFileURL(job.posterFile.path),
                width: job.posterFile.width,
                height: job.posterFile.height,
            };
            await saveTaskOutcome(schema, taskID, 'poster', details);
        }
    };

    monitorMedia();
    monitorPoster();
}

/**
 * Handle video or audio poster upload
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleMediaPoster(req, res, type) {
    try {
        let schema = req.params.schema;
        let token = req.query.token;
        let streamID = req.body.stream;
        let file = req.file;
        let sourceURL = req.body.url;
        let taskID = await checkTaskToken(schema, token, `add-${type}`);
        let imagePath = await FileManager.preserveFile(file, sourceURL, CacheFolders.image);
        if (!imagePath) {
            throw new HTTPError(400);
        }

        let url = getFileURL(imagePath);
        let metadata = await ImageManager.getImageMetadata(imagePath);
        let details = {
            poster_url: url,
            width: metadata.width,
            height: metadata.height,
        };
        await saveTaskOutcome(schema, taskID, 'poster', details);

        sendJSON(res, { url });
    } catch (err) {
        sendError(res, err);
    }
}

/**
 * Handle the addition of a new chunk to a stream
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleStream(req, res) {
    try {
        let jobID = req.query.id;
        let file = req.file;
        let abort = !!req.body.abort;
        let chunk = parseInt(req.body.chunk);
        let generatePoster = !!req.body.generate_poster;

        let job = VideoManager.findTranscodingJob(jobID);
        if (chunk === 0) {
            if (job) {
                throw new HTTPError(409);
            }
            if (!file) {
                throw new HTTPError(400);
            }
            // create the job
            let type = _.first(_.split(file.mimetype, '/'));
            if (type !== 'video' && type !== 'audio') {
                throw new HTTPError(400);
            }
            job = await VideoManager.startTranscodingJob(null, type, jobID);
            if (generatePoster) {
                await VideoManager.requestPosterGeneration(job);
            }
        } else {
            if (!job) {
                throw new HTTPError(404);
            }
        }
        if (file) {
            VideoManager.transcodeSegment(job, file);
        } else {
            VideoManager.endTranscodingJob(job, abort);
        }
        sendJSON(res, { status: 'OK' });
    } catch (err) {
        sendError(res, err);
    }
}

/**
 * Throw an 403 exception if a task token isn't valid
 *
 * @param  {String} schema
 * @param  {String} token
 * @param  {String} action
 *
 * @return {Promise<Number>}
 */
async function checkTaskToken(schema, token, action) {
    let db = await Database.open();
    let task = await Task.findOne(db, schema, { token }, 'id, action');
    if (!task || task.action !== action) {
        throw new HTTPError(403);
    }
    return task.id;
}

/**
 * Update progress of a task, indirectly modifying rows in other tables via
 * database triggers
 *
 * @param  {String} schema
 * @param  {Number} taskID
 * @param  {Number} completion
 *
 * @return {Promise}
 */
async function saveTaskProgress(schema, taskID, completion) {
    let db = await Database.open();
    let params = [ completion, taskID ];
    let table = Task.getTableName(schema);
    let sql = `
        UPDATE ${table} SET
        completion = $1
        WHERE id = $2
    `;
    await db.execute(sql, params);
}

/**
 * Update task object with results when it's done
 *
 * @param  {String} schema
 * @param  {Number} taskID
 * @param  {Object} details
 *
 * @return {Promise}
 */
async function saveTaskOutcome(schema, taskID, part, details) {
    let db = await Database.open();
    let params = [ details, taskID ];
    let table = Task.getTableName(schema);
    // merge in new details
    let detailsAfter = `details || $1`;
    // set the part to true
    let optionsAfter = `options || '{ "${part}": true }'`;
    // set etime to NOW() when there're no more false value
    let etimeAfter = `CASE WHEN "hasFalse"(${optionsAfter}) THEN null ELSE NOW() END`;
    // set completion to 100 when there're no more false value in options
    let completionAfter = `CASE WHEN "hasFalse"(${optionsAfter}) THEN completion ELSE 100 END`;
    let sql = `
        UPDATE ${table} SET
        details = ${detailsAfter},
        options = ${optionsAfter},
        etime = ${etimeAfter},
        completion = ${completionAfter}
        WHERE id = $2
    `;
    await db.execute(sql, params);
}

/**
 * Return the file extension and mime type
 *
 * @param  {String} path
 *
 * @return {Promise<Object>}
 */
async function getFileType(path) {
    let fd = await FS.openAsync(path, 'r');
    try {
        let len = 1024;
        let buffer = Buffer.alloc(len);
        await FS.readAsync(fd, buffer, 0, len, 0);
        let info = FileType(buffer);
        if (!info) {
            info = {
                ext: undefined,
                mime: 'application/octet-stream'
            };
        }
        return info;
    } finally {
        FS.closeAsync(fd);
    }
}

/**
 * Return the URL of a file in the cache folder
 *
 * @param  {String} path
 *
 * @return {String}
 */
function getFileURL(path) {
    return `/srv/media/${Path.relative(CacheFolders.root, path)}`
}

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
