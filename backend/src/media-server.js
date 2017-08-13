var _ = require('lodash');
var Promise = require('bluebird');
var FS = Promise.promisifyAll(require('fs'));
var ChildProcess = require('child_process');
var Express = require('express');
var BodyParser = require('body-parser');
var Multer  = require('multer');
var Request = require('request');
var Sharp = require('sharp');
var Piexif = require("piexifjs");
var Phantom = require('phantom');
var Crypto = require('crypto');
var Moment = require('moment');

var Database = require('database');
var Task = require('accessors/task');
var Reaction = require('accessors/reaction');
var Story = require('accessors/story');
var User = require('accessors/user');
var HttpError = require('errors/http-error');

var server;
var cacheFolder = '/var/cache/media';
var imageCacheFolder = `${cacheFolder}/images`;
var videoCacheFolder = `${cacheFolder}/videos`;
var audioCacheFolder = `${cacheFolder}/audios`;

process.env.VIPS_WARNING = false;

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
        //app.get('/media/html/screenshot/test', handleWebsiteScreenshotTest);
        app.post('/media/html/screenshot/:schema/:taskId', upload.array(), handleWebsiteScreenshot);
        app.post('/media/images/upload/:schema/:taskId', upload.single('file'), handleImageUpload);
        app.post('/media/videos/upload/:schema/:taskId', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'poster_file', maxCount: 1 }]), handleVideoUpload);
        app.post('/media/audios/upload/:schema/:taskId', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'poster_file', maxCount: 1 }]), handleAudioUpload);
        app.post('/media/stream/:jobId', upload.single('file'), handleStreamAppend);
        app.post('/media/stream', upload.single('file'), handleStreamCreate);

        app.post('/internal/import', handleImageImport);

        createCacheFolders();

        server = app.listen(80, () => {
            resolve();
            startPhantom();
        });
        server.once('error', (evt) => {
            reject(new Error(evt.message));
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
    var path = `${imageCacheFolder}/${hash}`;
    var image = applyFilters(Sharp(path), filters, format);
    image.toBuffer().then((buffer) => {
        sendFile(res, buffer, format);
    }).catch((err) => {
        sendError(res, err);
    });
}

function handleImageOriginalRequest(req, res) {
    var filename = req.params.filename;
    var path = `${imageCacheFolder}/${filename}`;
    getImageMetadata(path).then((metadata) => {
        res.type(metadata.format).sendFile(path);
    });
}

function handleVideoRequest(req, res) {
    var filename = req.params.filename;
    var path = `${videoCacheFolder}/${filename}`;
    res.sendFile(path);
}

function handleAudioRequest(req, res) {
    var filename = req.params.filename;
    var path = `${audioCacheFolder}/${filename}`;
    res.sendFile(path);
}

function handleWebsiteScreenshot(req, res) {
    // generate hash from URL + date
    var schema = req.params.schema;
    var taskId = parseInt(req.params.taskId);
    var websiteUrl;
    return checkTaskToken(schema, taskId, req.query.token).then(() => {
        websiteUrl = _.get(req.body, 'url');
        if (!websiteUrl) {
            throw new HttpError(400);
        }
    }).then(() => {
        // got nothing to return
        sendJson(res, {});

        processWebsiteScreenshot(schema, taskId, websiteUrl);
        return null;
    }).catch((err) => {
        sendError(res, err);
    });
}

function handleWebsiteScreenshotTest(req, res) {
    // generate hash from URL + date
    var url = req.query.url || 'https://www.google.com';
    var tempPath = makeTempPath(imageCacheFolder, url, '.jpeg');
    return createWebsiteScreenshot(url, tempPath).then((title) => {
        res.type('jpeg').sendFile(tempPath);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Do screencap of a website submitted by front-end code
 *
 * @param  {String} url
 *
 * @return {Promise}
 */
function processWebsiteScreenshot(schema, taskId, url) {
    // save the screenshot under a temporary name first
    var tempPath = makeTempPath(imageCacheFolder, url, '.jpeg');
    return createWebsiteScreenshot(url, tempPath).then((title) => {
        // rename it to its MD5 hash once we have the data
        return md5File(tempPath).then((hash) => {
            var dstPath = `${imageCacheFolder}/${hash}`;
            return moveFile(tempPath, dstPath).then(() => {
                return getImageMetadata(dstPath).then((metadata) => {
                    var width = metadata.width;
                    var height = metadata.height;
                    var clip = getDefaultClippingRect(width, height, 'top');
                    var posterUrl = `/media/images/${hash}`;
                    var website = { title, width, height, clip, poster_url: posterUrl };
                    var preserve = { clip: true };
                    return updateAssociatedObject(schema, taskId, website, preserve);
                });
            });
        });
    });
}

function handleImageUpload(req, res) {
    var schema = req.params.schema;
    var taskId = parseInt(req.params.taskId);
    var srcPath;
    var srcHash;
    return checkTaskToken(schema, taskId, req.query.token).then(() => {
        if (req.file) {
            srcPath = req.file.path;
            return md5File(srcPath).then((hash) => {
                srcHash = hash;
            });
        } else if (req.body.external_url) {
            var url = req.body.external_url;
            return downloadRemoteFile(url, imageCacheFolder).then((path) => {
                srcPath = path;
                return md5File(srcPath).then((hash) => {
                    srcHash = hash;
                });
            });
        }
        throw new HttpError(400);
    }).then(() => {
        var url = `/media/images/${srcHash}`;
        sendJson(res, { url });

        var dstPath = `${imageCacheFolder}/${srcHash}`;
        processImageUpload(schema, taskId, srcPath, dstPath, url);
        return null;
    }).catch((err) => {
        sendError(res, err);
    });
}

function handleImageImport(req, res) {
    return Promise.try(() => {
        var url = req.body.external_url;
        if (!url) {
            throw HttpError(400);
        }
        url = _.replace(url, 'localhost', '172.18.0.1');
        return downloadRemoteFile(url, imageCacheFolder).then((srcPath) => {
            return md5File(srcPath).then((srcHash) => {
                var dstPath = `${imageCacheFolder}/${srcHash}`;
                return moveFile(srcPath, dstPath).then(() => {
                    return getImageMetadata(dstPath).then((metadata) => {
                        var url = `/media/images/${srcHash}`;
                        var format = metadata.format;
                        var width = metadata.width;
                        var height = metadata.height;
                        var clip = getDefaultClippingRect(width, height, 'center');
                        return { url, format, width, height, clip };
                    });
                });
            });
        });
    }).then((image) => {
        sendJson(res, image);
    }).catch((err) => {
        sendError(res, err);
    });
}

function processImageUpload(schema, taskId, srcPath, dstPath, url) {
    return moveFile(srcPath, dstPath).then(() => {
        return getImageMetadata(dstPath).then((metadata) => {
            // update the object associated with task (no need to wait for it)
            var format = metadata.format;
            var width = metadata.width;
            var height = metadata.height;
            var clip = getDefaultClippingRect(width, height, 'center');
            var image = { url, format, width, height, clip };
            var preserve = { clip: true };
            return updateAssociatedObject(schema, taskId, image, preserve);
        });
    });
}

function handleVideoUpload(req, res) {
    return handleMediaUpload(req, res, 'video');
}

function handleAudioUpload(req, res) {
    return handleMediaUpload(req, res, 'audio');
}

function handleMediaUpload(req, res, type) {
    var schema = req.params.schema;
    var taskId = parseInt(req.params.taskId);
    var srcPath;
    var srcHash;
    var srcStreamId;
    var posterSrcPath;
    var posterSrcHash;
    var dstFolder;
    if (type === 'video') {
        dstFolder = videoCacheFolder;
    } else if (type === 'audio') {
        dstFolder = audioCacheFolder;
    }
    return checkTaskToken(schema, taskId, req.query.token).then(() => {
        // calculate hash of video file, downloading it if necessary
        var file = _.get(req.files, 'file.0');
        if (file) {
            srcPath = file.path;
            return md5File(srcPath).then((hash) => {
                srcHash = hash;
            });
        } else if (req.body.external_url) {
            var url = req.body.external_url;
            return downloadRemoteFile(url, dstFolder).then((path) => {
                srcPath = path;
                return md5File(srcPath).then((hash) => {
                    srcHash = hash;
                });
            });
        } else if (req.body.stream) {
            srcStreamId = req.body.stream;
            if (findTranscodingJob(srcStreamId)) {
                return;
            }
        }
        throw new HttpError(400);
    }).then(() => {
        // calculate hash of video poster, downloading the image if necessary
        var posterFile = _.get(req.files, 'poster_file.0');
        if (posterFile) {
            posterSrcPath = posterFile.path;
            return md5File(posterSrcPath).then((hash) => {
                posterSrcHash = hash;
            });
        } else if (req.poster_external_url) {
            var url = req.poster_external_url;
            return downloadRemoteFile(url, imageCacheFolder).then((path) => {
                posterSrcPath = path;
                return md5File(posterSrcPath).then((hash) => {
                    srcHash = hash;
                });
            });
        }
    }).then(() => {
        // for streaming upload, the URL won't be known until later
        var url = (srcHash) ? `/media/${type}s/${srcHash}` : undefined;
        var posterUrl = (posterSrcHash) ? `/media/images/${posterSrcHash}` : undefined;
        sendJson(res, { url, poster_url: posterUrl });

        if (srcStreamId) {
            processMediaStream(schema, taskId, srcStreamId);
        } else {
            var dstPath = `${dstFolder}/${srcHash}`;
            processMediaUpload(schema, taskId, srcPath, dstPath, type, srcHash, url);
        }
        var posterDstPath = (posterSrcHash) ? `${imageCacheFolder}/${posterSrcHash}` : undefined;
        processMediaPosterUpload(schema, taskId, posterSrcPath, posterDstPath, posterUrl);
        return null;
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Process a uploaded/downloaded video poster image
 *
 * @param  {String} schema
 * @param  {Number} taskId
 * @param  {String} srcPath
 * @param  {String} dstPath
 * @param  {String} url
 *
 * @return {Promise}
 */
function processMediaPosterUpload(schema, taskId, srcPath, dstPath, url) {
    return moveFile(srcPath, dstPath).then(() => {
        return getImageMetadata(dstPath).then((metadata) => {
            var width = metadata.width;
            var height = metadata.height;
            var clip = getDefaultClippingRect(width, height, 'center');
            var video = { poster_url: url, width, height, clip };
            var preserve = { clip: true, payload_id: true };
            return updateAssociatedObject(schema, taskId, video, preserve);
        });
    });
}

/**
 * Process a uploaded/downloaded video file
 *
 * @param  {String} schema
 * @param  {Number} taskId
 * @param  {String} srcPath
 * @param  {String} dstPath
 * @param  {String} srcHash
 * @param  {String} url
 *
 * @return {Promise}
 */
function processMediaUpload(schema, taskId, srcPath, dstPath, type, srcHash, url) {
    return moveFile(srcPath, dstPath).then(() => {
        var job = startTranscodingJob(dstPath, type, srcHash);
        return awaitTranscodingJob(job);
    }).then((job) => {
        var media = { url, versions: job.profiles };
        var preserve = {};
        return updateAssociatedObject(schema, taskId, media, preserve);
    });
}

/**
 * Process a video file being streamed in and transcoded on the fly
 *
 * @param  {String} schema
 * @param  {Number} taskId
 * @param  {String} streamId
 *
 * @return {Promise}
 */
function processMediaStream(schema, taskId, streamId) {
    var job = findTranscodingJob(streamId);
    return awaitTranscodingJob(job).then((job) => {
        var url = `/media/${job.type}s/${job.originalHash}`;
        var media = { url, stream: undefined, versions: job.profiles };
        var preserve = {};
        return updateAssociatedObject(schema, taskId, media, preserve);
    });
}

function handleStreamCreate(req, res) {
    return Promise.try(() => {
        return createJobId();
    }).then((jobId) => {
        var file = req.file;
        if (!file) {
            throw new HttpError(400);
        }
        var type = _.first(_.split(file.mimetype, '/'));
        if (type !== 'video' && type !== 'audio') {
            throw new HttpError(400);
        }
        var inputStream = FS.createReadStream(file.path);
        var job = startTranscodingJob(null, type, jobId);
        transcodeSegment(job, inputStream);
        return jobId;
    }).then((jobId) => {
        sendJson(res, { id: jobId });
    }).catch((err) => {
        sendError(res, err);
    });
}

function handleStreamAppend(req, res) {
    return Promise.try(() => {
        var file = req.file;
        var job = findTranscodingJob(req.params.jobId);
        if (!job) {
            throw new HttpError(404);
        }
        if (file) {
            var inputStream = FS.createReadStream(file.path);
            return transcodeSegment(job, inputStream);
        } else {
            return endTranscodingJob(job);
        }
    }).then(() => {
        sendJson(res, { status: 'OK' });
    }).catch((err) => {
        sendError(res, err);
    });
}

var phantomPromise;

function startPhantom() {
    if (!phantomPromise) {
        phantomPromise = B(Phantom.create(['--ignore-ssl-errors=yes']));
    }
    return phantomPromise;
}

function shutdownPhantom() {
    if (phantomPromise) {
        phantomPromise.then((instance) => {
            instance.exit();
        });
        phantomPromise = null;
    }
}

/**
 * Make screencap of website, returning the document title
 *
 * @param  {String} url
 * @param  {String} dstPath
 *
 * @return {Promise<String>}
 */
function createWebsiteScreenshot(url, dstPath) {
    return startPhantom().then((instance) => {
        return B(instance.createPage()).then((page) => {
            return B(page.setting('userAgent')).then((ua) => {
                // indicate in the UA string that this is a bot
                var settings = {
                    userAgent: ua + ' (compatible; trambarbot/1.0; +http://www.trambar.io/bot.html)',
                };
                return Promise.each(_.keys(settings), (key) => {
                    return page.setting(key, settings[key]);
                });
            }).then(() => {
                var width = 1024, height = 1024;
                var properties = {
                    viewportSize: { width,  height },
                    clipRect: { left: 0, top: 0, width, height },
                };
                return Promise.each(_.keys(properties), (key) => {
                    return page.property(key, properties[key]);
                })
            }).then(() => {
                return page.open(url);
            }).then(() => {
                var start = new Date;
                var last = start;
                page.on("onResourceRequested", (requestData) => {
                    // mark the time when a file request occurs
                    last = new Date;
                });
                return new Promise((resolve, reject) => {
                    var interval = setInterval(() => {
                        // we're done when there's a half a second pause in
                        // loading or after five seconds
                        var now = new Date;
                        var progress1 = (now - last) / 500;
                        var progress2 = (now - start) / 5000;
                        if (progress1 > 1 || progress2 > 1) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 100);
                });
            }).then(() => {
                return page.render(dstPath);
            }).then(() => {
                return page.invokeMethod('evaluate', function() {
                    return document.title;
                });
            }).then((title) => {
                return addJPEGDescription(title, dstPath).return(title);
            });
        });
    });
}

/**
 * Embed description into JPEG file
 *
 * @param {String} description
 * @param {String} dstPath
 */
function addJPEGDescription(description, dstPath) {
    return FS.readFileAsync(dstPath).then((buffer) => {
        var data = buffer.toString('binary');
        var zeroth = {};
        zeroth[Piexif.ImageIFD.ImageDescription] = description;
        zeroth[Piexif.ImageIFD.XResolution] = [96, 1];
        zeroth[Piexif.ImageIFD.YResolution] = [96, 1];
        zeroth[Piexif.ImageIFD.Software] = 'PhantomJS';
        zeroth[Piexif.ImageIFD.DateTime] = Moment().format('YYYY:MM:DD HH:mm:ss');
        var exifObj = { '0th': zeroth };
        var exifbytes = Piexif.dump(exifObj);
        var newData = Piexif.insert(exifbytes, data);
        return new Buffer(newData, 'binary');
    }).then((buffer) => {
        return FS.writeFileAsync(dstPath, buffer);
    });
}

/**
 * Get description embedded in JPEG filename
 *
 * @param  {String} path
 *
 * @return {Promise<String>}
 */
function getJPEGDescription(path) {
    return FS.readFileAsync(path).then((buffer) => {
        var data = buffer.toString('binary');
        var exifObj = Piexif.load(data);
        return _.get(exifObj, [ '0th', Piexif.ImageIFD.ImageDescription ], '');
    });
}

function createCacheFolders() {
    if (!FS.existsSync(cacheFolder)) {
        FS.mkdirSync(cacheFolder);
    }
    if (!FS.existsSync(imageCacheFolder)) {
        FS.mkdirSync(imageCacheFolder);
    }
    if (!FS.existsSync(videoCacheFolder)) {
        FS.mkdirSync(videoCacheFolder);
    }
    if (!FS.existsSync(audioCacheFolder)) {
        FS.mkdirSync(audioCacheFolder);
    }
}

var operators = {
    background: function(r, g, b, a) {
        this.background(r / 100, g / 100, b / 100, a / 100);
    },
    blur: function(sigma) {
        this.blur(sigma / 10 || 0.3)
    },
    crop: function(left, top, width, height) {
        this.extract({ left, top, width, height });
    },
    extract: function(channel) {
        this.extractChannel(channel);
    },
    flatten: function() {
        this.flatten();
    },
    flip: function() {
        this.flip();
    },
    flop: function() {
        this.flop();
    },
    height: function(height) {
        this.resize(null, height);
    },
    gamma: function(gamma) {
        this.gamma(gamma / 10 || 2.2);
    },
    grayscale: function() {
        this.grayscale();
    },
    normalize: function() {
        this.normalize();
    },
    negate: function() {
        this.negate();
    },
    quality: function(quality) {
        this.settings.quality = quality;
    },
    rotate: function(degree) {
        this.rotate(degree);
    },
    resize: function(width, height) {
        this.resize(width, height);
    },
    sharpen: function() {
        this.sharpen();
    },
    trim: function() {
        this.trim();
    },
    width: function(width) {
        this.resize(width, null);
    },
};

function applyFilters(image, filters, format) {
    image.settings = {
        quality: 90,
    };
    filters = _.split(filters, /[ +]/);
    _.each(filters, (filter) => {
        var cmd = '', args = [];
        var regExp = /(\D+)(\d*)/g, m;
        while(m = regExp.exec(filter)) {
            if (!cmd) {
                cmd = m[1];
            }
            var arg = parseInt(m[2]);
            if (arg === arg) {
                args.push(arg);
            }
        }
        var operator = null;
        _.each(operators, (operator, name) => {
            if (name.substr(0, cmd.length) === cmd) {
                operator.apply(image, args);
                return false;
            }
        });
    });
    var quality = image.settings.quality || 90;
    switch (_.toLower(format)) {
        case 'webp':
            image.webp({ quality })
        case 'png':
            image.png();
            break;
        case 'jpeg':
            image.jpeg({ quality });
            break;
    }
    return image;
}

/**
 * Return database accessor
 *
 * @param  {String} table
 *
 * @return {Accessor|undefined}
 */
function getAccessor(table) {
    switch (table) {
        case 'story': return Story;
        case 'reaction': return Reaction;
        case 'user': return User;
    }
}

function makeTempPath(dstFolder, url, ext) {
    var date = (new Date).toISOString();
    var hash = md5(`${url} ${date}`);
    if (!ext) {
        ext = '';
    }
    return `${dstFolder}/${hash}${ext}`;
}

/**
 * Save file to cache folder, using the MD5 hash of its content as name
 *
 * @param  {String} srcPath
 * @param  {String} dstFolder
 *
 * @return {String}
 */
function saveFile(srcPath, dstFolder) {
    return md5File(srcPath).then((hash) => {
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
 * Download file file off the Internet
 *
 * @param  {String} url
 * @param  {String} dstFolder
 *
 * @return {Promise<String>}
 */
function downloadRemoteFile(url, dstFolder) {
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
 * Return metadata of an image file
 *
 * @param  {String} path
 *
 * @return {Promise<Object>}
 */
function getImageMetadata(path) {
    return B(Sharp(path).metadata());
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
 * Update resources in an object associated with a task
 *
 * @param  {String} schema
 * @param  {Number} taskId
 * @param  {Object} params
 * @param  {Object} preserve
 *
 * @return {Promise}
 */
function updateAssociatedObject(schema, taskId, params, preserve) {
    return Database.open().then((db) => {
        return Task.findOne(db, schema, { id: taskId }, '*').then((task) => {
            var associate = _.get(task, 'details.associated_object');
            var table = _.get(associate, 'type');
            var id = _.get(associate, 'id');
            var accessor = getAccessor(associate.type);
            if (!accessor) {
                return;
            }
            return accessor.findOne(db, schema, { id }, '*').then((row) => {
                if (!row) {
                    return;
                }
                // task ids are used as payload ids on frontend
                var resources = _.get(row, 'details.resources');
                var res = _.find(resources, { payload_id: taskId });
                if (res) {
                    _.forIn(params, (value, name) => {
                        // set properties, overwrite values received from
                        // client-side unless it's flagged
                        if (res[name] == null || !preserve[name]) {
                            res[name] = value;
                        }
                    });
                    // clear the payload id if it's no longer needed
                    // (i.e. the task has been completed)
                    if (!preserve.payload_id) {
                        res.payload_id = undefined;

                        if (row.published === true && row.ptime === null) {
                            // set ptime if all tasks are done
                            var ready = _.every(resources, (res) => {
                                return !res.payload_id;
                            });
                            if (ready) {
                                row.ptime = Moment().toISOString();
                            }
                        }
                    }
                    return accessor.updateOne(db, schema, row);
                }
            })
        });
    });
}

function createJobId() {
    return new Promise((resolve, reject) => {
        Crypto.randomBytes(16, function(err, buffer) {
            var token = buffer.toString('hex');
            resolve(token);
        });
    });
}

var transcodingJobs = [];

/**
 * Find a transcoding job by id
 *
 * @param  {String} jobId
 *
 * @return {Object|null}
 */
function findTranscodingJob(jobId) {
    return _.find(transcodingJobs, { jobId }) || null;
}

/**
 * Start up instances of ffmpeg
 *
 * @param  {String|null} srcPath
 * @param  {String} type
 * @param  {String|null} streamId
 *
 * @return {Object}
 */
function startTranscodingJob(srcPath, type, jobId) {
    var job = {
        jobId,
        type,
        streaming: !srcPath,
    };
    if (type === 'video') {
        job.profiles = {
            '2500kbps': {
                videoBitrate: 2500 * 1000,
                audioBitrate: 128 * 1000,
                format: 'mp4',
            },
            '1000kbps': {
                videoBitrate: 1000 * 1000,
                audioBitrate: 128 * 1000,
                format: 'mp4',
            },
        };
        job.destination = videoCacheFolder;
    } else if (type === 'audio') {
        job.profiles = {
            '128kbps': {
                audioBitrate: 128  * 1000,
                format: 'mp3',
            },
        };
        job.destination = audioCacheFolder;
    }

    // launch instances of FFmpeg to create files for various profiles
    job.outputFiles = _.mapValues(job.profiles, (profile, name) => {
        return `${job.destination}/${jobId}.${name}.${profile.format}`;
    });
    job.processes = _.mapValues(job.outputFiles, (dstPath, name) => {
        return spawnFFmpeg(srcPath, dstPath, job.profiles[name]);
    });
    // create promises that resolve when FFmpeg exits
    var promises = _.mapValues(job.processes, (childProcess) => {
        return new Promise((resolve, reject) => {
            childProcess.on('exit', (code, signal) => {
                if (code >= 0) {
                    resolve()
                } else {
                    reject(new Error(`Process exited with error code ${code}`));
                }
            });
            childProcess.on('error', (err) => {
                console.error(err);
                reject(err)
            });
        });
    });
    job.promise = Promise.props(promises);

    if (job.streaming) {
        // add queue and other variables needed for streaming in video
        job.queue = [];
        job.working = false;
        job.finished = false;

        // create write stream to save original
        job.originalFile = `${job.destination}/${jobId}`;
        job.writeStream = FS.createWriteStream(job.originalFile);
        var filePromise = new Promise((resolve, reject) => {
            job.writeStream.once('error', reject);
            job.writeStream.once('finish', resolve);
        });

        // calculate MD5 hash along the way
        job.md5Hash = Crypto.createHash('md5');
        var hashPromise = new Promise((resolve, reject) => {
            job.md5Hash.once('readable', () => {
                resolve(job.md5Hash.read().toString('hex'));
            });
        });

        job.promise.then(() => {
            // rename the files once we have the MD5 hash
            return Promise.join(hashPromise, filePromise, (hash) => {
                var originalFile = _.replace(job.originalFile, job.jobId, hash);
                var outputFiles = _.mapValues(job.outputFiles, (outputFile) => {
                    return _.replace(outputFile, job.jobId, hash);
                });
                var srcFiles = _.concat(job.originalFile, _.values(job.outputFiles));
                var dstFiles = _.concat(originalFile, _.values(outputFiles));
                return Promise.map(srcFiles, (srcFile, index) => {
                    return moveFile(srcFile, dstFiles[index]);
                }).then(() => {
                    job.originalFile = originalFile;
                    job.outputFiles = outputFiles;
                    job.originalHash = hash;
                });
            });
        });
    }

    transcodingJobs.push(job);
    return job;
}

/**
 * Wait for transcoding job to finish
 *
 * @param  {Object} job
 * @return {Promise<Object>}
 */
function awaitTranscodingJob(job) {
    return job.promise.return(job);
}

/**
 * Add a file to the transcode queue
 *
 * @param  {Object} job
 * @param  {ReadableStream} file
 */
function transcodeSegment(job, inputStream) {
    job.queue.push(inputStream);
    if (!job.working) {
        processNextStreamSegment(job);
    }
}

/**
 * Indicate that there will be no more additional files
 *
 * @param  {Object} job
 */
function endTranscodingJob(job) {
    job.finished = true;
    if (!job.working) {
        processNextStreamSegment(job);
    }
}

/**
 * Get the next stream segment and pipe it to FFmpeg
 *
 * @param  {Object} job
 */
function processNextStreamSegment(job) {
    var inputStream = job.queue.shift();
    if (inputStream) {
        job.working = true;
        // save the original
        inputStream.pipe(job.writeStream, { end: false });
        // calculate MD5
        inputStream.pipe(job.md5Hash, { end: false });
        // pipe stream to stdin of FFmpeg, leaving stdin open afterward
        _.each(job.processes, (childProcess) => {
            inputStream.pipe(childProcess.stdin, { end: false });
        });
        inputStream.once('end', () => {
            // done, try processing the next segment
            processNextStreamSegment(job);
        });
    } else {
        job.working = false;
        if (job.finished) {
            // there are no more segments
            job.writeStream.end();
            job.md5Hash.end();
            // close stdin of FFmpeg so it'd exit after processing remaining data
            _.each(job.processes, (childProcess) => {
                childProcess.stdin.end();
            });
        }
    }
}

/**
 * Spawn an instance of FFmpeg
 *
 * @param  {String} srcPath
 * @param  {String} dstPath
 * @param  {Object} profile
 *
 * @return {ChildProcess}
 */
function spawnFFmpeg(srcPath, dstPath, profile) {
    var cmd = 'ffmpeg';
    var inputArgs = [], input = Array.prototype.push.bind(inputArgs);
    var outputArgs = [], output = Array.prototype.push.bind(outputArgs);
    var options = {
        stdio: [ 'inherit', 'inherit', 'inherit' ]
    };

    if (srcPath) {
        input('-i', srcPath);
    } else {
        // get input from stdin
        input('-i', 'pipe:0');
        options.stdio[0] = 'pipe';
    }

    // add output options
    if (profile.videoBitrate) {
        output('-b:v', profile.videoBitrate);
    }
    if (profile.audioBitrate) {
        output('-b:a', profile.audioBitrate);
    }
    if (profile.frameRate) {
        output('-r', profile.frameRate);
    }
    output(dstPath);

    var args = _.concat(inputArgs, outputArgs);
    return ChildProcess.spawn(cmd, args, options);
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
 * Generate MD5 hash of file contents
 *
 * @param  {String} srcPath
 *
 * @return {Promise<String>}
 */
function md5File(srcPath) {
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
 * Return a square clipping rect
 *
 * @param  {Number} width
 * @param  {Number} height
 * @param  {String} align
 *
 * @return {Object}
 */
function getDefaultClippingRect(width, height, align) {
    var left = 0, top = 0;
    var length = Math.min(width, height);
    if (align === 'center' || !align) {
        if (width > length) {
            left = Math.floor((width - length) / 2);
        } else if (height > length) {
            top = Math.floor((height - length) / 2);
        }
    }
    return { left, top, width: length, height: length };
}

function B(promise) {
    return Promise.resolve(promise);
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}

process.on('beforeExit', () => {
    shutdownPhantom();
});
