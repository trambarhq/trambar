var _ = require('lodash');
var Promise = require('bluebird');
var FS = Promise.promisifyAll(require('fs'));
var Express = require('express');
var BodyParser = require('body-parser');
var Multer  = require('multer');
var Sharp = require('sharp');
var Piexif = require("piexifjs");
var Phantom = require('phantom');
var Crypto = require('crypto')

var server;
var cacheFolder = '/var/cache/media';
var imageCacheFolder = `${cacheFolder}/images`;
var videoCacheFolder = `${cacheFolder}/videos`;

function start() {
    return new Promise((resolve, reject) => {
        var app = Express();
        var upload = Multer({ dest: '/var/tmp' });
        app.use(BodyParser.json());
        app.set('json spaces', 2);
        app.get('/media/images/:hash/:filename', handleImageFiltersRequest);
        app.post('/media/html/screenshot', handleWebsiteScreenshot);
        app.post('/media/images/upload', upload.array('images', 16), handleImageUpload);
        app.post('/media/videos/upload', upload.array('videos', 4), handleVideoUpload);
        app.use('/media/images', Express.static(imageCacheFolder));
        app.use('/media/videos', Express.static(videoCacheFolder));

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

function handleWebsiteScreenshot(req, res) {
    // generate hash from URL + date
    var url = _.get(req.body, 'url');
    var date = (new Date).toISOString().substr(0, 10);
    var hash = md5(`${url} ${date}`);
    var path = `${imageCacheFolder}/${hash}`;
    return FS.statAsync(path).then((stats) => {
        // just get title from the JPEG file if it already exists
        return getJPEGDescription(path);
    }).catch((err) => {
        if (!url) {
            throw new Error;
        }
        // save to temp path first, as PhantomJS needs the extension
        var tempPath = `${path}.jpeg`;
        return createWebsiteScreenshot(url, tempPath).then((title) => {
            return FS.renameAsync(tempPath, path).return(title);
        });
    }).then((title) => {
        var url = `/media/images/${hash}`;
        res.json({ url, title });
    }).catch((err) => {
        res.status(400).json({ message: 'Invalid request' });
    });
}

function handleImageUpload(req, res) {
    Promise.mapSeries(req.files, (file) => {
        return FS.readFileAsync(file.path).then((buffer) => {
            var hash = md5(buffer);
            var destPath = `${imageCacheFolder}/${hash}`;
            return FS.statAsync(destPath).catch((err) => {
                return FS.writeFileAsync(destPath, buffer);
            }).then(() => {
                return hash;
            });
        });
    }).then((hashes) => {
        var files = _.map(hashes, (hash) => {
            return {
                url: `/media/images/${hash}`
            };
        });
        res.json({ files });
    }).catch((err) => {
        res.status(500).json({ message: err.message });
    });
}

function handleVideoUpload(req, res) {

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
