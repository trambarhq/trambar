var _ = require('lodash');
var Promise = require('bluebird');
var FS = Promise.promisifyAll(require('fs'));
var Path = require('path');
var Express = require('express');
var CORS = require('cors');
var BodyParser = require('body-parser');
var Multer  = require('multer');
var Moment = require('moment');
var DNSCache = require('dnscache');
var FileType = require('file-type');

var Database = require('database');
var Shutdown = require('shutdown');
var Task = require('accessors/task');
var HTTPError = require('errors/http-error');

var CacheFolders = require('media-server/cache-folders');
var FileManager = require('media-server/file-manager');
var ImageManager = require('media-server/image-manager');
var VideoManager = require('media-server/video-manager');
var WebsiteCapturer = require('media-server/website-capturer');
var StockPhotoImporter = require('media-server/stock-photo-importer');

module.exports = {
    start,
    stop,
};

var server;
var cacheControl = {
    image: 'max-age=2592000, immutable',
    video: 'max-age=86400',
    audio: 'max-age=86400',
};

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

function start() {
    return new Promise((resolve, reject) => {
        var app = Express();
        var upload = Multer({ dest: '/var/tmp' });
        app.use(CORS());
        app.use(BodyParser.json());
        app.set('json spaces', 2);
        app.get('/media/images/:hash/:filename', handleImageFiltersRequest);
        app.get('/media/images/:filename', handleImageOriginalRequest);
        app.get('/media/videos/:filename', handleVideoRequest);
        app.get('/media/audios/:filename', handleAudioRequest);
        app.get('/media/cliparts/:filename', handleClipartRequest);
        app.post('/media/html/poster/:schema/', upload.array(), handleWebsitePoster);
        app.post('/media/images/upload/:schema/', upload.single('file'), handleImageUpload);
        app.post('/media/videos/upload/:schema/', upload.single('file'), handleVideoUpload);
        app.post('/media/videos/poster/:schema/', upload.single('file'), handleVideoPoster);
        app.post('/media/audios/upload/:schema/', upload.single('file'), handleAudioUpload);
        app.post('/media/audios/poster/:schema/', upload.single('file'), handleAudioPoster);
        app.post('/media/stream/', upload.single('file'), handleStream);
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
    return Shutdown.close(server);
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
 */
function sendStaticFile(res, path, cc, filename) {
    getFileType(path).then((info) => {
        res.type(info.mime);
        if (cc) {
            res.set('Cache-Control', cc);
        }
        if (filename) {
            res.set('Content-disposition', `attachment; filename=${filename}`);
        }
        return FS.lstatAsync(path).then((stat) => {
            if (stat.isSymbolicLink()) {
                // serve file through Express if it's a symlink, since it's probably
                // pointing to a file that only exist in this Docker container
                res.sendFile(path);
            } else {
                // ask Nginx to server the file
                var relPath = path.substr(CacheFolders.root.length + 1);
                var uri = `/static_media/${relPath}`;
                res.set('X-Accel-Redirect', uri).end();
            }
        });
    }).catch((err) => {
        sendError(res, new HTTPError(404));
    });
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
    if (process.env.NODE_ENV !== 'production') {
        console.error('sendError', err);
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
    var m = /([^.]*?)(\.(.+))?$/i.exec(filename);
    if (!m) {
        res.status(400).json({ message: 'Invalid filename' });
    }
    var filters = m[1], format = m[3];
    if (!format || format === 'jpg') {
        format = 'jpeg';
    }
    var path = `${CacheFolders.image}/${hash}`;
    return ImageManager.applyFilters(path, filters, format).then((buffer) => {
        sendFile(res, buffer, format, cacheControl.image);
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
    var path = `${CacheFolders.image}/${req.params.filename}`;
    sendStaticFile(res, path, cacheControl.video);
}

/**
 * Handle video request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleVideoRequest(req, res) {
    var path = `${CacheFolders.video}/${req.params.filename}`;
    sendStaticFile(res, path, cacheControl.video);
}

/**
 * Handle audio request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleAudioRequest(req, res) {
    var path = `${CacheFolders.audio}/${req.params.filename}`;
    sendStaticFile(res, path, cacheControl.audio);
}

/**
 * Handle clipart request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleClipartRequest(req, res) {
    var path = Path.resolve(`../media/cliparts/${req.params.filename}`);
    getFileType(path).then((info) => {
        res.type(info.mime);
        res.set('Cache-Control', 'max-age=86400');
        res.sendFile(path);
    }).catch((err) => {
        sendError(res, new HTTPError(404));
    });
}

/**
 * Handle request for website screenshit
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleWebsitePoster(req, res) {
    // generate hash from URL + date
    var schema = req.params.schema;
    var token = req.query.token;
    var url = req.body.url;
    return checkTaskToken(schema, token, 'add-website').then((taskId) => {
        if (!url) {
            throw new HTTPError(400);
        }
        var tempPath = FileManager.makeTempPath(CacheFolders.image, url, '.jpg');
        var options = {
            onProgress: (progress) => {
                saveTaskProgress(schema, taskId, progress);
            }
        };
        WebsiteCapturer.createScreenshot(url, tempPath, options).then((title) => {
            // rename it to its MD5 hash once we have the data
            var file = { path: tempPath };
            return FileManager.preserveFile(file, null, CacheFolders.image).then((imagePath) => {
                return ImageManager.getImageMetadata(imagePath).then((metadata) => {
                    var details = {
                        poster_url: getFileURL(imagePath),
                        title: metadata.title,
                        width: metadata.width,
                        height: metadata.height,
                    };
                    return saveTaskOutcome(schema, taskId, 'poster', details);
                }).then(() => {
                    return ImageManager.addJPEGDescription(title, imagePath);
                });
            });
        });
        // got nothing to return
        return {};
    }).then((results) => {
        sendJSON(res, results);
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
    var token = req.query.token;
    var file = req.file;
    var url = req.body.external_url;
    return checkTaskToken(schema, token, 'add-image').then((taskId) => {
        return FileManager.preserveFile(file, url, CacheFolders.image).then((imagePath) => {
            if (!imagePath) {
                throw new HTTPError(400);
            }
            //
            var url = getFileURL(imagePath);
            ImageManager.getImageMetadata(imagePath).then((metadata) => {
                var details = {
                    url: url,
                    format: metadata.format,
                    width: metadata.width,
                    height: metadata.height,
                    title: metadata.title,
                };
                return saveTaskOutcome(schema, taskId, 'main', details);
            });
            return { url };
        });
    }).then((results) => {
        sendJSON(res, results);
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
    return FileManager.preserveFile(file, url, CacheFolders.image).then((imagePath) => {
        if (!imagePath) {
            throw new HTTPError(400);
        }
        return ImageManager.getImageMetadata(imagePath).then((metadata) => {
            var details = {
                type: 'image',
                url: getFileURL(imagePath),
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
            };
            return details;
        });
    }).then((results) => {
        sendJSON(res, results);
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
 * Handle video poster
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleVideoPoster(req, res) {
    return handleMediaPoster(req, res, 'video');
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
 * Handle audio upload
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleAudioPoster(req, res) {
    return handleMediaPoster(req, res, 'audio');
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
    var streamId = req.body.stream;
    var file = req.file;
    var url = req.body.external_url;
    return checkTaskToken(schema, token, `add-${type}`).then((taskId) => {
        if (streamId) {
            // handle streaming upload--transcoding job has been created already
            var job = VideoManager.findTranscodingJob(streamId);
            if (!job) {
                throw new HTTPError(404);
            }
            monitorTranscodingJob(schema, taskId, job);
            return {};
        } else {
            // transcode an uploaded file--move it into cache folder first
            var dstFolder = CacheFolders[type];
            return FileManager.preserveFile(file, url, dstFolder).then((mediaPath) => {
                if (!mediaPath) {
                    throw new HTTPError(400);
                }
                // create the transcoding job, checking if it exists already on
                // the off-chance the same file is uploaded twice at the same time
                var jobId = Path.basename(mediaPath);
                if (!VideoManager.findTranscodingJob(jobId)) {
                    return VideoManager.startTranscodingJob(mediaPath, type, jobId).then((job) => {
                        if (req.body.generate_poster) {
                            return VideoManager.requestPosterGeneration(job).then(() => {
                                monitorTranscodingJob(schema, taskId, job);
                            });
                        } else {
                            monitorTranscodingJob(schema, taskId, job);
                        }
                        return {};
                    });
                }
            });
        }
    }).then((results) => {
        sendJSON(res, results);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Monitor a transcoding job, saving progress into a task object
 *
 * @param  {String} schema
 * @param  {Number} taskId
 * @param  {Object} job
 */
function monitorTranscodingJob(schema, taskId, job) {
    // monitor transcoding progress
    job.onProgress = (evt) => {
        var progress = evt.target.progress;
        console.log('Progress: ', progress + '%');
        saveTaskProgress(schema, taskId, progress);
    };
    if (job.posterFile) {
        // wait for poster to be generated
        VideoManager.awaitPosterGeneration(job).then(() => {
            var details = {
                poster_url: getFileURL(job.posterFile.path),
                width: job.posterFile.width,
                height: job.posterFile.height,
            };
            return saveTaskOutcome(schema, taskId, 'poster', details);
        });
    }

    // wait for transcoding to finish
    VideoManager.awaitTranscodingJob(job).then(() => {
        // save URL and information about available version to task object
        // (doing so transfer these properties into details.resources of
        // object that has the Task object's token as payload_token)
        var details = {
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
        return saveTaskOutcome(schema, taskId, 'main', details);
    });
}

/**
 * Handle video or audio poster upload
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleMediaPoster(req, res, type) {
    var schema = req.params.schema;
    var token = req.query.token;
    var streamId = req.body.stream;
    var file = req.file;
    var url = req.body.external_url;
    return checkTaskToken(schema, token, `add-${type}`).then((taskId) => {
        return FileManager.preserveFile(file, url, CacheFolders.image).then((imagePath) => {
            if (!imagePath) {
                throw new HTTPError(400);
            }
            var posterURL = getFileURL(imagePath);
            ImageManager.getImageMetadata(imagePath).then((metadata) => {
                var details = {
                    poster_url: posterURL,
                    width: metadata.width,
                    height: metadata.height,
                };
                return saveTaskOutcome(schema, taskId, 'poster', details);
            });
            return { url: posterURL };
        });
    }).then((results) => {
        sendJSON(res, results);
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
function handleStream(req, res) {
    var jobId = req.query.id;
    var file = req.file;
    var chunk = parseInt(req.body.chunk);
    return Promise.try(() => {
        var job = VideoManager.findTranscodingJob(jobId);
        if (chunk === 0) {
            if (job) {
                throw new HTTPError(409);
            }
            if (!file) {
                throw new HTTPError(400);
            }
            // create the job
            var type = _.first(_.split(file.mimetype, '/'));
            if (type !== 'video' && type !== 'audio') {
                throw new HTTPError(400);
            }
            return VideoManager.startTranscodingJob(null, type, jobId).then((job) => {
                if (req.body.generate_poster) {
                    return VideoManager.requestPosterGeneration(job).then(() => {
                        return job;
                    });
                }
                return job;
            });
        } else {
            if (!job) {
                throw new HTTPError(404);
            }
            return job;
        }
    }).then((job) => {
        if (file) {
            VideoManager.transcodeSegment(job, file);
        } else {
            VideoManager.endTranscodingJob(job);
        }
        return null;
    }).then(() => {
        sendJSON(res, { status: 'OK' });
    }).catch((err) => {
        sendError(res, err);
    });
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
function checkTaskToken(schema, token, action) {
    return Database.open().then((db) => {
        return Task.findOne(db, schema, { token }, 'id, action').then((task) => {
            if (!task || task.action !== action) {
                throw new HTTPError(403);
            }
            return task.id;
        });
    });
}

/**
 * Update progress of a task, indirectly modifying rows in other tables via
 * database triggers
 *
 * @param  {String} schema
 * @param  {Number} taskId
 * @param  {Number} completion
 *
 * @return {Promise}
 */
function saveTaskProgress(schema, taskId, completion) {
    return Database.open().then((db) => {
        var params = [ completion, taskId ];
        var table = Task.getTableName(schema);
        var sql = `
            UPDATE ${table} SET
            completion = $1
            WHERE id = $2
        `;
        return db.execute(sql, params);
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
function saveTaskOutcome(schema, taskId, part, details) {
    return Database.open().then((db) => {
        var params = [ details, taskId ];
        var table = Task.getTableName(schema);
        // merge in new details
        var detailsAfter = `details || $1`;
        // set the part to true
        var optionsAfter = `options || '{ "${part}": true }'`;
        // set etime to NOW() when there're no more false value
        var etimeAfter = `CASE WHEN (${optionsAfter})::text NOT LIKE '%: false%' THEN NOW() ELSE null END`;
        var sql = `
            UPDATE ${table} SET
            details = ${detailsAfter},
            options = ${optionsAfter},
            etime = ${etimeAfter},
            completion = 100
            WHERE id = $2
        `;
        return db.execute(sql, params);
    });
}

/**
 * Return the file extension and mime type
 *
 * @param  {String} path
 *
 * @return {Promise<Object>}
 */
function getFileType(path) {
    var len = 1024;
    var buffer = Buffer.alloc(len);
    return FS.openAsync(path, 'r').then((fd) => {
        return FS.readAsync(fd, buffer, 0, len, 0).then(() => {
            var info = FileType(buffer);
            if (!info) {
                info = {
                    ext: undefined,
                    mime: 'application/octet-stream'
                };
            }
            return info;
        });
    });
}

/**
 * Return the URL of a file in the cache folder
 *
 * @param  {String} path
 *
 * @return {String}
 */
function getFileURL(path) {
    return `/media/${Path.relative(CacheFolders.root, path)}`
}

if (process.argv[1] === __filename) {
    start();
}

Shutdown.on(stop);
