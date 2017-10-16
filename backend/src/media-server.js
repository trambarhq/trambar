var _ = require('lodash');
var Promise = require('bluebird');
var FS = require('fs');
var Express = require('express');
var BodyParser = require('body-parser');
var Multer  = require('multer');
var Moment = require('moment');
var DNSCache = require('dnscache');

var Database = require('database');
var Task = require('accessors/task');
var HttpError = require('errors/http-error');

var CacheFolders = require('media-server/cache-folders');
var FileManager = require('media-server/file-manager');
var ImageManager = require('media-server/image-manager');
var VideoManager = require('media-server/video-manager');
var WebsiteCapturer = require('media-server/website-capturer');
var StockPhotoImporter = require('media-server/stock-photo-importer');

var server;

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

function start() {
    return new Promise((resolve, reject) => {
        var app = Express();
        var upload = Multer({ dest: '/var/tmp' });
        app.use(BodyParser.json());
        app.set('json spaces', 2);
        app.get('/media/images/:hash/:filename', handleImageFiltersRequest);
        app.get('/media/images/:filename', handleImageOriginalRequest);
        app.get('/media/videos/:filename', handleVideoRequest);
        app.get('/media/audios/:filename', handleAudioRequest);
        app.post('/media/html/screenshot/:schema/:taskId', upload.array(), handleWebsiteScreenshot);
        app.post('/media/images/upload/:schema/:taskId', upload.single('file'), handleImageUpload);
        app.post('/media/videos/upload/:schema/:taskId', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'poster_file', maxCount: 1 }]), handleVideoUpload);
        app.post('/media/audios/upload/:schema/:taskId', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'poster_file', maxCount: 1 }]), handleAudioUpload);
        app.post('/media/stream/:jobId', upload.single('file'), handleStreamAppend);
        app.post('/media/stream', upload.single('file'), handleStreamCreate);

        app.post('/internal/import', upload.single('file'), handleImageImport);

        CacheFolders.create();
        StockPhotoImporter.importPhotos();

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

function stop() {
    return new Promise((resolve, reject) => {
        if (server) {
            server.close();
            server.on('close', () => {
                resolve();
            });
        } else {
            resolve();
        }
    });
}

/**
 * Send a JSON object to browser
 *
 * @param  {Response} res
 * @param  {Object} result
 */
function sendJson(res, result) {
    res.json(result);
}

/**
 * Send binary data to browser
 *
 * @param  {Response} res
 * @param  {Buffer} buffer
 * @param  {String} type
 */
function sendFile(res, buffer, type) {
    res.type(type).send(buffer);
}

/**
 * Send error to browser as JSON object
 *
 * @param  {Response} res
 * @param  {Object} err
 */
function sendError(res, err) {
    var statusCode = err.statusCode;
    var message = err.message;
    if (!statusCode || process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }
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
function handleImageFiltersRequest(req, res) {
    var hash = req.params.hash;
    var filename = req.params.filename;
    var m = /([^.]*?)(\.(jpg|jpeg|png|webp))?$/i.exec(filename);
    if (!m) {
        res.status(400).json({ message: 'Invalid filename' });
    }
    var filters = m[1], format = m[3];
    if (!format || format === 'jpg') {
        format = 'jpeg';
    }
    var path = `${CacheFolders.image}/${hash}`;
    return ImageManager.applyFilters(path, filters, format).then((buffer) => {
        sendFile(res, buffer, format);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Handle request of original images
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleImageOriginalRequest(req, res) {
    var filename = req.params.filename;
    var path = `${CacheFolders.image}/${filename}`;
    ImageManager.getImageMetadata(path).then((metadata) => {
        res.type(metadata.format).sendFile(path);
    });
}

/**
 * Handle video request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleVideoRequest(req, res) {
    var filename = req.params.filename;
    var path = `${CacheFolders.video}/${filename}`;
    res.sendFile(path);
}

/**
 * Handle audio request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleAudioRequest(req, res) {
    var filename = req.params.filename;
    var path = `${CacheFolders.audio}/${filename}`;
    res.sendFile(path);
}

/**
 * Handle request for website screenshit
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleWebsiteScreenshot(req, res) {
    // generate hash from URL + date
    var schema = req.params.schema;
    var taskId = parseInt(req.params.taskId);
    var token = req.query.token;
    var url = req.body.url;
    return checkTaskToken(schema, taskId, token).then(() => {
        if (!url) {
            throw new HttpError(400);
        }
        var tempPath = FileManager.makeTempPath(CacheFolders.image, url, '.jpeg');
        WebsiteCapturer.createScreenshot(url, tempPath).then((title) => {
            // rename it to its MD5 hash once we have the data
            return FileManager.hashFile(tempPath).then((hash) => {
                var dstPath = `${CacheFolders.image}/${hash}`;
                return FileManager.moveFile(tempPath, dstPath).then(() => {
                    return ImageManager.getImageMetadata(dstPath).then((metadata) => {
                        var url = `/media/images/${hash}`;
                        var width = metadata.width;
                        var height = metadata.height;
                        var details = { poster_url: url, title, width, height };
                        return saveTaskOutcome(schema, taskId, details);
                    }).then(() => {
                        return ImageManager.addJPEGDescription(title, dstPath);
                    });
                });
            });
        });
        // got nothing to return
        return {};
    }).then((resutls) => {
        sendJson(res, results);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Handle image upload, either attached file or a URL
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleImageUpload(req, res) {
    var schema = req.params.schema;
    var taskId = parseInt(req.params.taskId);
    var token = req.query.token;
    var file = req.file;
    var url = req.body.external_url;
    return checkTaskToken(schema, taskId, req.query.token).then(() => {
        return FileManager.preserveFile(file, url, CacheFolders.image).then((imageFile) => {
            if (!imageFile) {
                throw new HttpError(400);
            }
            var url = `/media/images/${imageFile.hash}`;
            ImageManager.getImageMetadata(imageFile.path).then((metadata) => {
                var format = metadata.format;
                var width = metadata.width;
                var height = metadata.height;
                var details = { url, format, width, height };
                return saveTaskOutcome(schema, taskId, details);
            });
            return { url };
        });
    }).then((results) => {
        sendJson(res, results);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Handle internal image import request from other part of system
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleImageImport(req, res) {
    var file = req.file;
    var url = req.body.external_url;
    return FileManager.preserveFile(file, url, CacheFolders.image).then((imageFile) => {
        if (!imageFile) {
            throw new HttpError(400);
        }
        return ImageManager.getImageMetadata(imageFile.path).then((metadata) => {
            var url = `/media/images/${imageFile.hash}`;
            var format = metadata.format;
            var width = metadata.width;
            var height = metadata.height;
            return { url, format, width, height };
        });
    }).then((results) => {
        sendJson(res, results);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Handle video upload
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleVideoUpload(req, res) {
    return handleMediaUpload(req, res, 'video');
}

/**
 * Handle audio upload
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleAudioUpload(req, res) {
    return handleMediaUpload(req, res, 'audio');
}

/**
 * Handle video or audio upload, either as attached file, a URL, or a stream
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleMediaUpload(req, res, type) {
    var schema = req.params.schema;
    var token = req.query.token;
    var taskId = parseInt(req.params.taskId);
    var streamId = req.body.stream;
    var file = _.get(req.files, 'file.0');
    var url = req.body.external_url;
    var posterFile = _.get(req.files, 'poster_file.0');
    var posterUrl = req.poster_external_url;
    return checkTaskToken(schema, taskId, token).then(() => {
        if (streamId) {
            // handle streaming upload
            var job = VideoManager.findTranscodingJob(streamId);
            VideoManager.awaitTranscodingJob(job).then((job) => {
                var details = {
                    url: `/media/${job.type}s/${job.originalHash}`,
                    versions: job.profiles
                };
                return saveTaskOutcome(schema, taskId, details);
            });
            // URL won't be known until after file has fully uploaded
            return { url: undefined };
        } else {
            var dstFolder = CacheFolders[type];
            return FileManager.preserveFile(file, url, dstFolder).then((mediaFile) => {
                if (!saved) {
                    throw HttpError(400);
                }
                var url = `/media/${type}s/${srcHash}`;
                var job = VideoManager.startTranscodingJob(mediaFile.path, type, mediaFile.hash);
                VideoManager.awaitTranscodingJob(job).then((job) => {
                    var details = {
                        url,
                        versions: job.profiles
                    };
                    return saveTaskOutcome(schema, taskId, details);
                });
                return { url };
            })
        }
    }).then((results) => {
        return FileManager.preserveFile(posterFile, posterUrl, CacheFolders.image).then((poster) => {
            if (poster) {
                var posterUrl = `/media/images/${poster.hash}`;
                ImageManager.getImageMetadata(poster.path).then((metadata) => {
                    var details = {
                        poster_url: url,
                        width: metadata.width,
                        height: metadata.height,
                    };
                    return saveTaskProgress(schema, taskId, details);
                });
                results.poster_url = posterUrl;
            }
            return results;
        });
    }).then((results) => {
        sendJson(res, results);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Handle request for stream creation
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleStreamCreate(req, res) {
    return VideoManager.createJobId().then((jobId) => {
        var file = req.file;
        if (!file) {
            throw new HttpError(400);
        }
        var type = _.first(_.split(file.mimetype, '/'));
        if (type !== 'video' && type !== 'audio') {
            throw new HttpError(400);
        }
        var inputStream = FS.createReadStream(file.path);
        var job = VideoManager.startTranscodingJob(null, type, jobId);
        VideoManager.transcodeSegment(job, inputStream);
        return { id: jobId };
    }).then((results) => {
        sendJson(res, results);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Handle the addition of a new chunk to a stream
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleStreamAppend(req, res) {
    return Promise.try(() => {
        var file = req.file;
        var job = VideoManager.findTranscodingJob(req.params.jobId);
        if (!job) {
            throw new HttpError(404);
        }
        if (file) {
            var inputStream = FS.createReadStream(file.path);
            return VideoManager.transcodeSegment(job, inputStream);
        } else {
            return VideoManager.endTranscodingJob(job);
        }
    }).then(() => {
        sendJson(res, { status: 'OK' });
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Throw an 403 exception if a task token isn't valid
 *
 * @param  {String} schema
 * @param  {Number} taskId
 * @param  {String} token
 *
 * @return {Promise}
 */
function checkTaskToken(schema, taskId, token) {
    return Database.open().then((db) => {
        return Task.findOne(db, schema, { id: taskId }, 'token').then((task) => {
            if (!task || task.token !== token) {
                throw new HttpError(403);
            }
            return task;
        });
    });
}

/**
 * Update progress of a task, indirectly modifying rows in other tables via
 * database triggers
 *
 * @param  {String} schema
 * @param  {Number} taskId
 * @param  {Object} details
 * @param  {Number} completion
 *
 * @return {Promise}
 */
function saveTaskProgress(schema, taskId, details, completion) {
    return Database.open().then((db) => {
        return Task.findOne(db, schema, { id: taskId }, '*').then((task) => {
            if (completion) {
                task.completion = completion;
                if (completion === 100) {
                    task.etime = Object('NOW()');
                }
                if (task.details) {
                    _.assign(task.details, details);
                }
            }
            return Task.updateOne(db, schema, task);
        });
    });
}

/**
 * Update task object with results when it's done
 *
 * @param  {String} schema
 * @param  {Number} taskId
 * @param  {Object} details
 *
 * @return {Promise}
 */
function saveTaskOutcome(schema, taskId, details) {
    return saveTaskProgress(schema, taskId, details, 100);
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
