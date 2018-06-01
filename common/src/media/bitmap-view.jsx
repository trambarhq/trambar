var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var BlobManager = require('transport/blob-manager');
var BlobReader = require('transport/blob-reader');
var MediaLoader = require('media/media-loader');
var JPEGAnalyser = require('media/jpeg-analyser');
var ComponentRefs = require('utils/component-refs');

module.exports = React.createClass({
    displayName: 'BitmapView',
    propTypes: {
        url: PropTypes.string,
        clippingRect: PropTypes.object,
        onLoad: PropTypes.func,
        onError: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            canvas: HTMLCanvasElement,
        });
        return {};
    },

    /**
     * Load image on mount
     */
    componentWillMount: function() {
        this.load(this.props.url);
    },

    /**
     * Update image when URL or clipping rect changes
     *
     * @param  {Object} nextProps
     */
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

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var setters = this.components.setters;
        var props = _.omit(this.props, 'onLoad', 'url', 'clippingRect');
        // give empty canvas a size so it scale correctly when empty
        props.width = 4;
        props.height = 4;
        return <canvas ref={setters.canvas} {...props} />
    },

    /**
     * Draw image on mount (if it manages to load that fast)
     */
    componentDidMount: function() {
        if (this.image && this.redrawNeeded) {
            // image was loaded before first render
            this.drawImage(this.props.clippingRect);
        }
    },

    /**
     * Inform parent component that loading is complete
     */
    triggerLoadEvent: function() {
        if (this.props.onLoad) {
            this.props.onLoad({
                type: 'load',
                target: this,
            });
        }
    },

    /**
     * Inform parent component that an error occurred
     *
     * @param  {Error} err
     */
    triggerErrorEvent: function(err) {
        if (this.props.onError) {
            this.props.onError({
                type: 'error',
                target: this,
                error: err
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
            return BlobManager.fetch(url).then((blob) => {
                // load the image and its bytes
                var imageP = MediaLoader.loadImage(blob);
                var bytesP = BlobReader.loadUint8Array(blob);
                return Promise.join(imageP, bytesP, (image, bytes) => {
                    var orientation = JPEGAnalyser.getOrientation(bytes) || 1;

                    this.image = image;
                    this.orientation = orientation;
                    if (orientation < 5) {
                        this.naturalWidth = image.naturalWidth;
                        this.naturalHeight = image.naturalHeight;
                    } else {
                        this.naturalWidth = image.naturalHeight;
                        this.naturalHeight = image.naturalWidth;
                    }

                    this.drawImage(this.props.clippingRect);
                    this.triggerLoadEvent();
                });
            }).catch((err) => {
                console.error(err)
                this.triggerErrorEvent(err);
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
        var canvas = this.components.canvas;
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
        if (!rect) {
            rect = {
                left: 0,
                top: 0,
                width: this.naturalWidth,
                height: this.naturalHeight
            };
        }
        this.width = rect.width;
        this.height = rect.height;

        var inverse = invert(matrix);
    	var src = transformRect(inverse, rect);
    	var dst = transformRect(inverse, { left: 0, top: 0, width: rect.width, height: rect.height });
    	canvas.width = dst.width;
    	canvas.height = dst.height;
    	var context = canvas.getContext('2d');
    	context.transform.apply(context, matrix);
        context.drawImage(image, src.left, src.top, src.width, src.height, dst.left, dst.top, dst.width, dst.height);
    },

    extractMosaic: function() {
        try {
            var canvas = this.components.canvas;
            var miniCanvas = document.createElement('CANVAS');
            miniCanvas.width = 48;
            miniCanvas.height = 48;
            var miniContext = miniCanvas.getContext('2d');
            miniContext.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, miniCanvas.width, miniCanvas.height);
            var microCanvas = document.createElement('CANVAS');
            microCanvas.width = 4;
            microCanvas.height = 4;
            var microContext = microCanvas.getContext('2d');
            microContext.drawImage(miniCanvas, 0, 0, miniCanvas.width, miniCanvas.height, 0, 0, microCanvas.width, microCanvas.height);
            var imageData = microContext.getImageData(0, 0, microCanvas.width, microCanvas.height);
            var pixels = imageData.data;
            if (_.size(pixels) >= 64) {
                var colors = [];
                for (var i = 0; i < 16; i++) {
                    var r = pixels[i * 4 + 0];
                    var g = pixels[i * 4 + 1];
                    var b = pixels[i * 4 + 2];
                    var rgb = (r << 16) | (g << 8) | (b << 0);
                    colors.push(rgb.toString(16));
                }
                return colors;
            }
        } catch (err) {

        }
    },

    /**
     * Collapsed the canvas
     */
    clearCanvas: function() {
        var canvas = this.components.canvas;
        if (canvas) {
            canvas.width = 0;
        	canvas.height = 0;
        }

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
