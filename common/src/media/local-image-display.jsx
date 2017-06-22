var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var BlobReader = require('utils/blob-reader');
var JpegAnalyser = require('media/jpeg-analyser');

module.exports = React.createClass({
    displayName: 'LocalImageDisplay',
    propTypes: {
        file: PropTypes.instanceOf(Blob),
        clippingRect: PropTypes.object,
        onLoad: PropTypes.func,
    },

    componentDidMount: function() {
        this.load(this.props.file);
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.file !== nextProps.file) {
            this.load(nextProps.file);
        }
        if (this.clippingRect !== nextProps.clippingRect) {
            this.drawImage(this.image, this.orientation, nextProps.clippingRect);
        }
    },

    render: function() {
        var props = _.omit(this.props, 'onLoad', 'file', 'clippingRect');
        return <canvas ref="canvas" {...props} />
    },

    triggerLoadEvent: function() {
        if (this.props.onLoad) {
            this.props.onLoad({
                type: 'load',
                target: this,
            });
        }
    },

    /**
     * Load the file or clear the canvas if it's null
     *
     * @param  {Blob|null} file
     *
     * @return {Promise}
     */
    load: function(file) {
        if (file) {
            var imageP = BlobReader.loadImage(file);
            var orientationP = BlobReader.loadUint8Array(file).then((bytes) => {
                return JpegAnalyser.getOrientation(bytes);
            });
            return Promise.join(imageP, orientationP, (image, orientation) => {
                this.drawImage(image, orientation || 1, this.props.clippingRect);
                this.triggerLoadEvent();
            });
        } else {
            this.clearCanvas();
            return Promise.resolve();
        }
    },

    /**
     * Set the canvas's dimensions and draw an image into it
     *
     * @param  {HTMLImageElement} image
     * @param  {Number} orientation
     * @param  {Object} rect
     */
    drawImage: function(image, orientation, rect) {
        var imageWidth = image.naturalWidth;
    	var imageHeight = image.naturalHeight;
    	var matrix;
    	switch (orientation) {
    		case 1:
    			// normal
    			matrix = [1, 0, 0, 1, 0, 0];
    			break;
    		case 2:
    			// flip horizontally
    			matrix = [-1, 0, 0, 1, imageWidth, 0];
    			break;
    		case 3:
    			// rotate 180
    			matrix = [-1, 0, 0, -1, imageWidth, imageHeight];
    			break;
    		case 4:
    			// flip vertically
    			matrix = [1, 0, 0, -1, 0, imageHeight];
    			break;
    		case 5:
    			// transpose
    			matrix = [0, 1, 1, 0, 0, 0];
    			break;
    		case 6:
    			// rotate 90
    			matrix = [0, 1, -1, 0, imageHeight, 0];
    			break;
    		case 7:
    			// transverse
    			matrix = [0, -1, -1, 0, imageHeight, imageWidth]
    			break;
    		case 8:
    			// rotate 270
    			matrix = [0, -1, 1, 0, 0, imageWidth];
    			break;
    	}
        // clipping rect has coordinates in post-transform space
        // need to map them to the pre-transform space
        if (!rect) {
            rect = {
                left: 0,
                top: 0,
                width: (orientation < 5) ? imageWidth : imageHeight,
                height: (orientation < 5) ? imageHeight : imageWidth,
            };
        }
        var inverse = invert(matrix);
    	var src = transformRect(inverse, rect);
    	var dst = transformRect(inverse, { left: 0, top: 0, width: rect.width, height: rect.height });
        var canvas = this.refs.canvas;
    	canvas.width = dst.width;
    	canvas.height = dst.height;
    	var context = canvas.getContext('2d');
    	context.transform.apply(context, matrix);
        context.drawImage(image, src.left, src.top, src.width, src.height, dst.left, dst.top, dst.width, dst.height);

        this.image = image;
        this.width = rect.width;
        this.height = rect.height;
        this.naturalWidth = imageWidth;
        this.naturalHeight = imageHeight;
        this.orientation = orientation;
    },

    /**
     * Collapsed the canvas
     */
    clearCanvas: function() {
        var canvas = this.refs.canvas;
        canvas.width = 0;
    	canvas.height = 0;

        this.width = 0;
        this.height = 0;
        this.orientation = undefined;
    },
});

/**
 * Calculate inverse of affine matrix
 *
 * @param  {Array<Number>} m
 *
 * @return {Array<Number>}
 */
function invert(m) {
	var [a, b, c, d, e, f] = m;
	var dt = (a * d - b * c);
	return [
		d / dt,
		-b / dt,
		-c / dt,
		a / dt,
		(c * f - d * e) / dt,
		-(a * f - b * e) / dt,
	];
}

/**
 * Transform a point using affine matrix
 *
 * @param  {Array<Number>} m
 * @param  {Array<Number>} p
 *
 * @return {Array<Number>}
 */
function transform(m, p) {
	var [a, b, c, d, e, f] = m;
	var [x, y] = p;
	return [
		a * x + c * y + e,
		b * x + d * y + f,
	];
}

/**
 * Transform a rectangle using affine matrix
 *
 * @param  {Array<Number>} m
 * @param  {Object} r
 *
 * @return {Object}
 */
function transformRect(m, r) {
	var c1 = [ r.left, r.top ];
	var c2 = [ r.left + r.width, r.top + r.height ];
	c1 = transform(m, c1);
	c2 = transform(m, c2);
	return {
		width: Math.abs(c2[0] - c1[0]),
		height: Math.abs(c2[1] - c1[1]),
		left: Math.min(c2[0], c1[0]),
		top: Math.min(c2[1], c1[1]),
	};
}
