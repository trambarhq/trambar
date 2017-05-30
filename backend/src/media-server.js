var _ = require('lodash');
var Promise = require('bluebird');
var Fs = Promise.promisifyAll(require('fs'));
var Express = require('express');
var BodyParser = require('body-parser');
var Sharp = require('sharp');
var Piexif = require("piexifjs");
var Phantom = require('phantom');
var Crypto = require('crypto')

var app = Express();
var server = app.listen(8081);

// create the cache folders
var cacheFolder = '/var/cache/media';
if (!Fs.existsSync(cacheFolder)) {
    Fs.mkdirSync(cacheFolder);
}
var imageCacheFolder = `${cacheFolder}/images`;
if (!Fs.existsSync(imageCacheFolder)) {
    Fs.mkdirSync(imageCacheFolder);
}
var videoCacheFolder = `${cacheFolder}/videos`;
if (!Fs.existsSync(videoCacheFolder)) {
    Fs.mkdirSync(videoCacheFolder);
}

app.use(BodyParser.json());
app.set('json spaces', 2);

app.get('/media/images/:hash/:filename', handleResizedImageRequest);

app.get('/media/images/:hash', handleOriginalImageRequest);

app.post('/media/html/screenshot', handleWebsiteScreenshot);

app.post('/media/images/upload', handleImageUpload);

app.post('/media/video/upload', handleVideoUpload);

function handleOriginalImageRequest(req, res) {

}

function handleResizedImageRequest(req, res) {

}

function handleWebsiteScreenshot(req, res) {
    // generate hash from URL + date
    var url = _.get(req.body, 'url');
    var date = (new Date).toISOString().substr(0, 10);
    var hash = md5(`${url} ${date}`);
    var path = `${imageCacheFolder}/${hash}`;
    return Fs.statAsync(path).then((stats) => {
        // just get title from the JPEG file if it already exists
        return getJPEGDescription(path);
    }).catch((err) => {
        if (!url) {
            throw new Error;
        }
        // save to temp path first, as PhantomJS needs the extension
        var tempPath = `${path}.jpeg`;
        return createWebsiteScreenshot(url, tempPath).then((title) => {
            return Fs.renameAsync(tempPath, path).return(title);
        });
    }).then((title) => {
        var url = `/media/images/${hash}`;
        res.json({ url, title });
    }).catch((err) => {
        res.status(400).json({ message: 'Invalid request' });
    });
}

function handleImageUpload(req, res) {

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
    return Fs.readFileAsync(destPath).then((buffer) => {
        var data = buffer.toString('binary');
        var zeroth = {};
        zeroth[Piexif.ImageIFD.ImageDescription] = description;
        var exifObj = { '0th': zeroth };
        var exifbytes = Piexif.dump(exifObj);
        var newData = Piexif.insert(exifbytes, data);
        return new Buffer(newData, 'binary');
    }).then((buffer) => {
        return Fs.writeFileAsync(destPath, buffer);
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
    return Fs.readFileAsync(path).then((buffer) => {
        var data = buffer.toString('binary');
        var exifObj = Piexif.load(data);
        return _.get(exifObj, [ '0th', Piexif.ImageIFD.ImageDescription ], '');
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
    return hash.digest("hex");
}

function B(promise) {
    return Promise.resolve(promise);
}
