var _ = require('lodash');
var Promise = require('bluebird');
var FS = Promise.promisifyAll(require('fs'));
var Sharp = require('sharp');
var Piexif = require("piexifjs");
var Moment = require('moment');

module.exports = {
    applyFilters,
    getImageMetadata,
    getJPEGDescription,
    addJPEGDescription,
};

/**
 * Return metadata of an image file
 *
 * @param  {String} path
 *
 * @return {Promise<Object>}
 */
function getImageMetadata(path) {
    return Promise.try(() => {
        return Sharp(path).metadata();
    }).catch((err) => {
        return FS.readFileAsync(path).then((data) => {
            return Sharp(data).metadata();
        });
    })
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
    negate: function() {
        this.negate();
    },
    normalize: function() {
        this.normalize();
    },
    lossless: function() {
        this.settings.lossless = true;
    },
    quality: function(quality) {
        if (quality) {
            this.settings.quality = quality;
        }
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

/**
 * Apply filters to an image and reencode it in the specified format
 *
 * @param  {String} path
 * @param  {String} filters
 * @param  {String} format
 *
 * @return {Promise<Buffer>}
 */
function applyFilters(path, filters, format) {
    var image = Sharp(path);
    return applyFiltersToImage(image, filters, format).catch((err) => {
        // sometimes Sharp will fail when a file path is given
        // whereas a blob will work
        return FS.readFileAsync(path).then((data) => {
            var image = Sharp(data);
            return applyFiltersToImage(image, filters, format);
        });
    })
}

function applyFiltersToImage(image, filters, format) {
    return Promise.try(() => {
        image.settings = {
            quality: 90,
            lossless: false,
        };
        _.each(_.split(filters, /[ +]/), (filter) => {
            var cmd = '', args = [];
            var regExp = /(\D+)(\d*)/g, m;
            while(m = regExp.exec(filter)) {
                if (!cmd) {
                    cmd = m[1];
                } else {
                    // ignore the delimiter
                }
                var arg = parseInt(m[2]);
                if (arg === arg) {
                    args.push(arg);
                }
            }
            var operator = null;
            _.each(operators, (operator, name) => {
                // see which operator's name start with the letter(s)
                if (name.substr(0, cmd.length) === cmd) {
                    operator.apply(image, args);
                    return false;
                }
            });
        });
        var quality = image.settings.quality;
        var lossless = image.settings.lossless;
        switch (_.toLower(format)) {
            case 'webp':
                image.webp({ quality, lossless });
                break;
            case 'png':
                image.png();
                break;
            case 'jpeg':
                image.jpeg({ quality });
                break;
        }
        return image.toBuffer();
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

process.env.VIPS_WARNING = false;
