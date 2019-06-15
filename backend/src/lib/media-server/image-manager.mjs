import _ from 'lodash';
import Bluebird from 'bluebird';
import FS from 'fs'; Bluebird.promisifyAll(FS);
import Sharp from 'sharp';
import Piexif from "piexifjs";
import Moment from 'moment';
import XMLDOM from 'xmldom'; const { DOMParser, XMLSerializer } = XMLDOM;
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
        const data = await FS.readFileAsync(path);
        return Sharp(data).metadata();
    }
}

const sharpOperators = {
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
            const image = Sharp(path);
            return applyFiltersToImage(image, filters, format);
        } catch (err) {
            // sometimes Sharp will fail when a file path is given
            // whereas a blob will work
            const data = await FS.readFileAsync(path);
            const image = Sharp(data);
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
    const quality = image.settings.quality;
    const lossless = image.settings.lossless;
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
const svgOperators = {
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
    const xml = await FS.readFileAsync(path, 'utf-8');
    const parser = new DOMParser;
    const doc = parser.parseFromString(xml);
    const svg = doc.getElementsByTagName('svg')[0];
    if (svg) {
        // see what changes are needed
        const params = {};
        applyOperators(params, svgOperators, filters);

        // get the dimensions first
        const width = parseFloat(svg.getAttribute('width')) || 0;
        const height = parseFloat(svg.getAttribute('height')) || 0;
        const viewBoxString = svg.getAttribute('viewBox');
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
            const vbScaleX = viewBox[2] / width;
            const vbScaleY = viewBox[3] / height;
            const vbPrecision = Math.max(0, Math.round(3 - Math.log10(viewBox[2])));
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

    const serializer = new XMLSerializer;
    const newXML = serializer.serializeToString(doc);
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
        let cmd = '';
        const args = [];
        const regExp = /(\D+)(\d*)/g;
        let m;
        while(m = regExp.exec(filter)) {
            if (!cmd) {
                cmd = m[1];
            } else {
                // ignore the delimiter
            }
            const arg = parseInt(m[2]);
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
    const buffer = await FS.readFileAsync(dstPath);
    const data = buffer.toString('binary');
    const zeroth = {};
    zeroth[Piexif.ImageIFD.ImageDescription] = description;
    zeroth[Piexif.ImageIFD.XResolution] = [96, 1];
    zeroth[Piexif.ImageIFD.YResolution] = [96, 1];
    zeroth[Piexif.ImageIFD.Software] = 'PhantomJS';
    zeroth[Piexif.ImageIFD.DateTime] = Moment().format('YYYY:MM:DD HH:mm:ss');
    const exifObj = { '0th': zeroth };
    const exifbytes = Piexif.dump(exifObj);
    const newData = Piexif.insert(exifbytes, data);
    const newBuffer = new Buffer(newData, 'binary');
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
    const buffer = await FS.readFileAsync(path);
    const data = buffer.toString('binary');
    const exifObj = Piexif.load(data);
    const description = _.get(exifObj, [ '0th', Piexif.ImageIFD.ImageDescription ], '');
    return description;
}

process.env.VIPS_WARNING = false;

export {
    applyFilters,
    getImageMetadata,
    getJPEGDescription,
    addJPEGDescription,
};
