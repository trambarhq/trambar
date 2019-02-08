import _ from 'lodash';
import Bluebird from 'bluebird';
import FS from 'fs'; Bluebird.promisifyAll(FS);
import Sharp from 'sharp';
import Piexif from "piexifjs";
import Moment from 'moment';
import { DOMParser, XMLSerializer } from 'xmldom';

/**
 * Return metadata of an image file
 *
 * @param  {String} path
 *
 * @return {Promise<Object>}
 */
async function getImageMetadata(path) {
    try {
        return Sharp(path).metadata();
    } catch (err) {
        // sometimes Sharp can't read a file for some reason
        let data = await FS.readFileAsync(path);
        return Sharp(data).metadata();
    }
}

let sharpOperators = {
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
async function applyFilters(path, filters, format) {
    if (format === 'svg') {
        return applyFiltersToSVGDocument(path, filters);
    } else {
        try {
            let image = Sharp(path);
            return applyFiltersToImage(image, filters, format);
        } catch (err) {
            // sometimes Sharp will fail when a file path is given
            // whereas a blob will work
            let data = await FS.readFileAsync(path);
            let image = Sharp(data);
            return applyFiltersToImage(image, filters, format);
        }
    }
}

async function applyFiltersToImage(image, filters, format) {
    image.settings = {
        quality: 90,
        lossless: false,
    };
    image.rotate();
    applyOperators(image, sharpOperators, filters);
    let quality = image.settings.quality;
    let lossless = image.settings.lossless;
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
        default:
            throw new Error(`Unknown output format: ${format}`);
    }
    return image.toBuffer();
}

// current implementation is fairly limited
let svgOperators = {
    crop: function(left, top, width, height) {
        this.crop = { left, top, width, height };
    },
    height: function(height) {
        this.height = height;
    },
    resize: function(width, height) {
        this.width = width;
        this.height = height;
    },
    width: function(width) {
        this.width = width;
    },
};

/**
 * Apply filters on an SVG document
 *
 * @param  {String} path
 * @param  {String} filters
 *
 * @return {Promise<Buffer>}
 */
async function applyFiltersToSVGDocument(path, filters) {
    if (!filters) {
        return FS.readFileAsync(path);
    }
    // parse the XML doc
    let xml = await FS.readFileAsync(path, 'utf-8');
    let parser = new DOMParser;
    let doc = parser.parseFromString(xml);
    let svg = doc.getElementsByTagName('svg')[0];
    if (svg) {
        // see what changes are needed
        let params = {};
        applyOperators(params, svgOperators, filters);

        // get the dimensions first
        let width = parseFloat(svg.getAttribute('width')) || 0;
        let height = parseFloat(svg.getAttribute('height')) || 0;
        let viewBoxString = svg.getAttribute('viewBox');
        let viewBox;
        if (viewBoxString) {
            viewBox = _.map(_.split(viewBoxString, /\s+/), (s) => {
                return parseInt(s);
            });
        }
        if (!width) {
            if (viewBox) {
                width = viewBox[2];
            }
        }
        if (!height) {
            if (viewBox) {
                height = viewBox[3];
            }
        }
        if (!width) {
            width = 1000;
        }
        if (!height) {
            height = 1000;
        }
        if (!viewBox) {
            viewBox = [ 0, 0, width, height ];
        }

        if (params.crop) {
            let vbScaleX = viewBox[2] / width;
            let vbScaleY = viewBox[3] / height;
            let vbPrecision = Math.max(0, Math.round(3 - Math.log10(viewBox[2])));
            width = params.crop.width;
            height = params.crop.height;
            viewBox[0] = _.round(params.crop.left * vbScaleX + viewBox[0], vbPrecision);
            viewBox[1] = _.round(params.crop.top * vbScaleY + viewBox[1], vbPrecision);
            viewBox[2] = _.round(params.crop.width * vbScaleX, vbPrecision);
            viewBox[3] = _.round(params.crop.height * vbScaleY, vbPrecision);
        }
        if (params.width !== undefined || params.height !== undefined) {
            if (params.width && params.height === undefined) {
                height = _.round(height * (params.width / width));
                width = params.width;
            } else if (params.height && params.width === undefined) {
                width = _.round(width * (params.height / height));
                height = params.height;
            } else {
                width = params.width;
                height = params.height;
            }
        }
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', _.join(viewBox, ' '));
    }

    let serializer = new XMLSerializer;
    let newXML = serializer.serializeToString(doc);
    return Buffer.from(newXML, 'utf-8');
}

/**
 * Find functions for filters and call them on target
 *
 * @param  {Object} target
 * @param  {Object<Function>} operators
 * @param  {String} filters
 */
function applyOperators(target, operators, filters) {
    for (let filter of _.split(filters, /[ +]/)) {
        let cmd = '', args = [];
        let regExp = /(\D+)(\d*)/g, m;
        while(m = regExp.exec(filter)) {
            if (!cmd) {
                cmd = m[1];
            } else {
                // ignore the delimiter
            }
            let arg = parseInt(m[2]);
            if (arg === arg) {
                args.push(arg);
            }
        }
        if (cmd) {
            for (let [ name, operator ] of _.entries(operators)) {
                // see which operator's name start with the letter(s)
                if (name.substr(0, cmd.length) === cmd) {
                    operator.apply(target, args);
                    break;
                }
            }
        }
    }
}

/**
 * Embed description into JPEG file
 *
 * @param {String} description
 * @param {String} dstPath
 */
async function addJPEGDescription(description, dstPath) {
    let buffer = await FS.readFileAsync(dstPath);
    let data = buffer.toString('binary');
    let zeroth = {};
    zeroth[Piexif.ImageIFD.ImageDescription] = description;
    zeroth[Piexif.ImageIFD.XResolution] = [96, 1];
    zeroth[Piexif.ImageIFD.YResolution] = [96, 1];
    zeroth[Piexif.ImageIFD.Software] = 'PhantomJS';
    zeroth[Piexif.ImageIFD.DateTime] = Moment().format('YYYY:MM:DD HH:mm:ss');
    let exifObj = { '0th': zeroth };
    let exifbytes = Piexif.dump(exifObj);
    let newData = Piexif.insert(exifbytes, data);
    let newBuffer = new Buffer(newData, 'binary');
    return FS.writeFileAsync(dstPath, newBuffer);
}

/**
 * Get description embedded in JPEG filename
 *
 * @param  {String} path
 *
 * @return {Promise<String>}
 */
async function getJPEGDescription(path) {
    let buffer = await FS.readFileAsync(path);
    let data = buffer.toString('binary');
    let exifObj = Piexif.load(data);
    let description = _.get(exifObj, [ '0th', Piexif.ImageIFD.ImageDescription ], '');
    return description;
}

process.env.VIPS_WARNING = false;

export {
    applyFilters,
    getImageMetadata,
    getJPEGDescription,
    addJPEGDescription,
};
