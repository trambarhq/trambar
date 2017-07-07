var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var HttpRequest = require('transport/http-request');
var JpegAnalyser = require('media/jpeg-analyser');

module.exports = React.createClass({
    displayName: 'ImageView',
    propTypes: {
        url: PropTypes.string,
        clippingRect: PropTypes.object,
        onLoad: PropTypes.func,
    },

    componentWillMount: function() {
        this.load(this.props.url);
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.url !== nextProps.url) {
            this.load(nextProps.url);
        }
        if (this.clippingRect !== nextProps.clippingRect) {
            if (this.image) {
                this.drawImage(nextProps.clippingRect);
            }
        }
    },

    render: function() {
        var props = _.omit(this.props, 'onLoad', 'url', 'clippingRect');
        return <canvas ref="canvas" {...props} />
    },

    componentDidMount: function() {
        if (this.image && this.redrawNeeded) {
            // image was loaded before first render
            this.drawImage(this.props.clippingRect);
        }
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
     * Load file at given URL or clear the canvas if it's empty
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    load: function(url) {
        if (url) {
            return Promise.join(loadImage(url), loadBytes(url), (image, bytes) => {
                var orientation = JpegAnalyser.getOrientation(bytes) || 1;
                var rect = this.props.clippingRect;

                this.image = image;
                this.width = rect.width;
                this.height = rect.height;
                this.naturalWidth = image.naturalWidth;
                this.naturalHeight = image.naturalHeight;
                this.orientation = orientation;

                this.drawImage(rect);
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
     * @param  {Object} rect
     */
    drawImage: function(rect) {
        var image = this.image;
        if (!image) {
            return;
        }
        var canvas = this.refs.canvas;
        if (!canvas) {
            this.redrawNeeded = true;
            return;
        }
        var orientation = this.orientation;
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
    	canvas.width = dst.width;
    	canvas.height = dst.height;
    	var context = canvas.getContext('2d');
    	context.transform.apply(context, matrix);
        context.drawImage(image, src.left, src.top, src.width, src.height, dst.left, dst.top, dst.width, dst.height);
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

function loadImage(url) {
    return new Promise((resolve, reject) => {
        var image = document.createElement('IMG');
        image.src = url;
        image.onload = function(evt) {
            resolve(image);
        };
        image.onerror = function(evt) {
            reject(new Error(`Unable to load ${url}`));
        };
    });
}

function loadBytes(url) {
    var options = {
        responseType: 'arraybuffer'
    };
    return HttpRequest.fetch('GET', url, null, options).then((result) => {
        var bytes = new Uint8Array(result);
        return bytes;
    });
}

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
