var _ = require('lodash');
var Promise = require('bluebird');
var FS = Promise.promisifyAll(require('fs'));
var ChildProcess = require('child_process');
var Express = require('express');
var BodyParser = require('body-parser');
var Multer  = require('multer');
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
var streamCacheFolder = `${cacheFolder}/stream`;

process.env.VIPS_WARNING = false;

function start() {
    return new Promise((resolve, reject) => {
        var app = Express();
        var upload = Multer({ dest: '/var/tmp' });
        app.use(BodyParser.json());
        app.set('json spaces', 2);
        app.get('/media/images/:hash/:filename', handleImageFiltersRequest);
        app.get('/media/images/:hash', handleImageOriginalRequest);
        app.get('/media/videos/:hash', handleVideoOriginalRequest);
        app.post('/media/html/screenshot/:schema/:taskId', handleWebsiteScreenshot);
        app.post('/media/images/upload/:schema/:taskId', upload.single('file'), handleImageUpload);
        app.post('/media/videos/upload/:schema/:taskId', upload.single('file'), handleVideoUpload);
        app.post('/media/stream/:streamId', upload.single('file'), handleStreamAppend);
        app.post('/media/stream', upload.single('file'), handleStreamCreate);

        createCacheFolders();

        server = app.listen(80, () => {
            resolve();
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
        res.type(format).send(buffer);
    }).catch((err) => {
        res.status(400).json({ message: err.message });
    });
}

function handleImageOriginalRequest(req, res) {
    var hash = req.params.hash;
    var path = `${imageCacheFolder}/${hash}`;
    B(Sharp(path).metadata()).then((metadata) => {
        res.type(metadata.format).sendFile(path);
    });
}

function handleVideoOriginalRequest(req, res) {

}

function handleWebsiteScreenshot(req, res) {
    // generate hash from URL + date
    return Promise.try(() => {
        var url = _.get(req.body, 'url');
        if (!url) {
            throw new HttpError(400);
        }
        var date = (new Date).toISOString();
        var urlHash = md5(`${url} ${date}`);
        var tempPath = `${imageCacheFolder}/${urlHash}.jpeg`;
        return createWebsiteScreenshot(url, tempPath).then((title) => {
            return FS.readFileAsync(tempPath).then((buffer) => {
                var hash = md5(buffer);
                var path = `${imageCacheFolder}/${hash}`;
                return FS.statAsync(path).catch(() => {
                    return FS.renameAsync(tempPath, path);
                }).then(() => {
                    var url = `/media/images/${hash}`;
                    res.json({ url, title });
                });
            });
        });
    }).catch((err) => {
        var statusCode = err.statusCode || 500;
        res.status(statusCode).json({ message: err.message });
    });
}

function handleImageUpload(req, res) {
    var schema = req.params.schema;
    var taskId = parseInt(req.params.taskId);
    var token = req.query.token;
    return Database.open().then((db) => {
        return Task.findOne(db, schema, { id: taskId }, '*').then((task) => {
            if (!task || task.token !== token) {
                throw new HttpError(403);
            }
            return task;
        }).then((task) => {
            var file = req.file;
            return FS.readFileAsync(file.path).then((buffer) => {
                var hash = md5(buffer);
                var destPath = `${imageCacheFolder}/${hash}`;
                return FS.statAsync(destPath).catch((err) => {
                    return FS.writeFileAsync(destPath, buffer);
                }).then(() => {
                    return `/media/images/${hash}`;
                });
            }).then((url) => {
                // update the object associated with task
                var associate = _.get(task, 'details.associated_object');
                var table = _.get(associate, 'type');
                var id = _.get(associate, 'id');
                var accessor = getAccessor(associate.type);
                if (accessor) {
                    return accessor.findOne(db, schema, { id }, 'id, details').then((row) => {
                        var params = { url, file: undefined };
                        updateResources(row, taskId, params);
                        return accessor.updateOne(db, schema, row);
                    }).return(url);
                }
                return url;
            });
        });
    }).then((url) => {
        res.json({ url });
    }).catch((err) => {
        var statusCode = err.statusCode || 500;
        res.status(err.statusCode || 500).json({ message: err.message });
    });
}

function handleVideoUpload(req, res) {

}

function handleStreamCreate(req, res) {
    return Promise.try(() => {
        return createStreamId();
    }).then((streamId) => {
        startTranscoding(streamId);
        var file = req.file;
        if (file) {
            var inputStream = FS.createReadStream(file.path);
            transcodeChunk(streamId, inputStream);
        }
        return streamId;
    }).then((streamId) => {
        res.json({ id: streamId });
    }).catch((err) => {
        console.error(err);
        var statusCode = err.statusCode || 500;
        res.status(err.statusCode || 500).json({ message: err.message });
    });
}

function handleStreamAppend(req, res) {
    return Promise.try(() => {
        var file = req.file;
        var streamId = req.params.streamId;
        if (file) {
            var inputStream = FS.createReadStream(file.path);
            return transcodeChunk(streamId, inputStream);
        } else {
            return endTranscoding(streamId);
        }
    }).then(() => {
        res.json({ status: 'OK' });
    }).catch((err) => {
        console.error(err);
        var statusCode = err.statusCode || 500;
        res.status(err.statusCode || 500).json({ message: err.message });
    });
}

/**
 * Make screencap of website, returning the document title
 *
 * @param  {String} url
 * @param  {String} destPath
 *
 * @return {Promise<String>}
 */
function createWebsiteScreenshot(url, destPath) {
    return B(Phantom.create(['--ignore-ssl-errors=yes'])).then((instance) => {
        return B(instance.createPage()).then((page) => {
            var dimensions = { width: 1024, height: 768 };
            return B(page.property('viewportSize', dimensions)).then(() => {
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
                return page.render(destPath);
            }).then(() => {
                return page.invokeMethod('evaluate', function() {
                    return document.title;
                });
            }).then((title) => {
                return addJPEGDescription(title, destPath).return(title);
            });
        }).finally(() => {
            instance.exit();
        })
    });
}

/**
 * Embed description into JPEG file
 *
 * @param {String} description
 * @param {String} destPath
 */
function addJPEGDescription(description, destPath) {
    return FS.readFileAsync(destPath).then((buffer) => {
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
        return FS.writeFileAsync(destPath, buffer);
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
    if (!FS.existsSync(streamCacheFolder)) {
        FS.mkdirSync(streamCacheFolder);
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

function updateResources(object, taskId, params) {
    var resources = _.get(object, 'details.resources');
    var res = _.find(resources, { task_id: taskId });
    if (res) {
        _.assign(res, params, { task_id: undefined });
    }
}

function createStreamId() {
    return new Promise((resolve, reject) => {
        Crypto.randomBytes(16, function(err, buffer) {
            var token = buffer.toString('hex');
            resolve(token);
        });
    });
}

var transcodeTasks = [];

/**
 * Start up instances of ffmpeg
 *
 * @param  {String} streamId
 */
function startTranscoding(streamId) {
    var profiles = {
        '2500kbps': {
            videoBitrate: '2500k',
            audioBitrate: '128k',
            extension: 'mp4',
        },
        '1000kbps': {
            videoBitrate: '1000k',
            audioBitrate: '128k',
            extension: 'mp4',
        },
    };
    var outputFiles = _.mapValues(profiles, (profile, name) => {
        return `${streamCacheFolder}/${streamId}.${name}.${profile.extension}`;
    });
    // launch instances of FFmpeg
    var processes = _.mapValues(outputFiles, (destPath, name) => {
        return spawnFFmpeg(destPath, profiles[name]);
    });
    // create promises that resolve when FFmpeg exits
    var promises = _.map(processes, (childProcess) => {
        return new Promise((resolve, reject) => {
            childProcess.once('exit', (code, signal) => {
                if (code >= 0) {
                    resolve()
                } else {
                    reject(new Error(`Process exited with error code ${code}`));
                }
            });
            childProcess.on('error', (evt) => {
                console.error(evt);
            });
        });
    });
    // create write stream to save original
    var originalFile = `${streamCacheFolder}/${streamId}.webm`;
    var writeStream = FS.createWriteStream(originalFile);
    transcodeTasks.push({
        streamId,
        profiles,
        originalFile,
        outputFiles,
        processes,
        writeStream,
        promise: Promise.all(promises),
        queue: [],
        working: false,
        finished: false,
    });
}

/**
 * Add a file to the transcode queue
 *
 * @param  {String} streamId
 * @param  {ReadableStream} file
 */
function transcodeChunk(streamId, inputStream) {
    var task = _.find(transcodeTasks, { streamId });
    if (!task) {
        throw new HttpError(404);
    }
    task.queue.push(inputStream);
    if (!task.working) {
        processNextStreamSegment(task);
    }
}

/**
 * Indicate that there will be no more additional files
 *
 * @param  {String} streamId
 */
function endTranscoding(streamId) {
    var task = _.find(transcodeTasks, { streamId });
    if (!task) {
        throw new HttpError(404);
    }
    task.finished = true;
    if (!task.working) {
        processNextStreamSegment(task);
    }
}

/**
 * Get the next stream segment and pipe it to FFmpeg
 *
 * @param  {Object} task
 */
function processNextStreamSegment(task) {
    var inputStream = task.queue.shift();
    if (inputStream) {
        task.working = true;
        // save the original
        inputStream.pipe(task.writeStream, { end: false });
        // pipe stream to stdin of FFmpeg, leaving stdin open afterward
        _.each(task.processes, (childProcess) => {
            inputStream.pipe(childProcess.stdin, { end: false });
        });
        inputStream.once('end', () => {
            // done, try processing the next segment
            processNextStreamSegment(task);
        });
    } else {
        task.working = false;
        if (task.finished) {
            // there are no more segments--close stdin of FFmpeg so it'd exit
            // after processing remaining data
            _.each(task.processes, (childProcess) => {
                childProcess.stdin.end();
            });
            task.writeStream.end();
        }
    }
}

/**
 * Spawn an instance of FFmpeg that gets its input from stdin
 *
 * @param  {String} destPath
 * @param  {Object} profile
 *
 * @return {ChildProcess}
 */
function spawnFFmpeg(destPath, profile) {
    var cmd = 'ffmpeg';
    var options = {
        stdio: [ 'pipe', 'inherit', 'inherit' ]
    };
    var inputArgs = [], input = Array.prototype.push.bind(inputArgs);
    var outputArgs = [], output = Array.prototype.push.bind(outputArgs);

    // add input options
    input('-i', 'pipe:0');

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
    output(destPath);

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
    return hash.digest("hex");
}

function B(promise) {
    return Promise.resolve(promise);
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
