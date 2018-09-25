import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as BlobManager from 'transport/blob-manager';
import * as BlobReader from 'transport/blob-reader';
import * as MediaLoader from 'media/media-loader';
import * as JPEGAnalyser from 'media/jpeg-analyser';
import ComponentRefs from 'utils/component-refs';

class BitmapView extends PureComponent {
    static displayName = 'BitmapView';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            canvas: HTMLCanvasElement,
        });
    }

    /**
     * Load image on mount
     */
    componentWillMount() {
        let { url } = this.props;
        this.load(url);
    }

    /**
     * Update image when URL or clipping rect changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { url, clippingRect } = this.props;
        if (nextProps.url !== url) {
            this.load(nextProps.url);
        }
        if (nextProps.clippingRect !== clippingRect) {
            if (this.image) {
                this.drawImage(nextProps.clippingRect);
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { setters } = this.components;
        let props = _.omit(this.props, 'onLoad', 'url', 'clippingRect');
        // give empty canvas a size so it scale correctly when empty
        props.width = 4;
        props.height = 4;
        return <canvas ref={setters.canvas} {...props} />
    }

    /**
     * Draw image on mount (if it manages to load that fast)
     */
    componentDidMount() {
        let { clippingRect } = this.props;
        if (this.image && this.redrawNeeded) {
            // image was loaded before first render
            this.drawImage(clippingRect);
        }
    }

    /**
     * Inform parent component that loading is complete
     */
    triggerLoadEvent() {
        let { onLoad } = this.props;
        if (onLoad) {
            onLoad({
                type: 'load',
                target: this,
            });
        }
    }

    /**
     * Inform parent component that an error occurred
     *
     * @param  {Error} err
     */
    triggerErrorEvent(err) {
        let { onError } = this.props;
        if (onError) {
            onError({
                type: 'error',
                target: this,
                error: err
            });
        }
    }

    /**
     * Load file at given URL or clear the canvas if it's empty
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    load(url) {
        let { clippingRect } = this.props;
        if (url) {
            return BlobManager.fetch(url).then((blob) => {
                // load the image and its bytes
                let imageP = MediaLoader.loadImage(blob);
                let bytesP = BlobReader.loadUint8Array(blob);
                return Promise.join(imageP, bytesP, (image, bytes) => {
                    let orientation = JPEGAnalyser.getOrientation(bytes) || 1;

                    this.image = image;
                    this.orientation = orientation;
                    if (orientation < 5) {
                        this.naturalWidth = image.naturalWidth;
                        this.naturalHeight = image.naturalHeight;
                    } else {
                        this.naturalWidth = image.naturalHeight;
                        this.naturalHeight = image.naturalWidth;
                    }

                    this.drawImage(clippingRect);
                    this.triggerLoadEvent();
                    return null;
                });
            }).catch((err) => {
                console.error(err)
                this.triggerErrorEvent(err);
                return null;
            });
        } else {
            this.clearCanvas();
            return Promise.resolve();
        }
    }

    /**
     * Set the canvas's dimensions and draw an image into it
     *
     * @param  {Object} rect
     */
    drawImage(rect) {
        let { canvas } = this.components;
        let image = this.image;
        if (!image) {
            return;
        }
        if (!canvas) {
            this.redrawNeeded = true;
            return;
        }
        let orientation = this.orientation;
        let imageWidth = image.naturalWidth;
    	let imageHeight = image.naturalHeight;
    	let matrix;
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

        let inverse = invert(matrix);
    	let src = transformRect(inverse, rect);
    	let dst = transformRect(inverse, { left: 0, top: 0, width: rect.width, height: rect.height });
    	canvas.width = dst.width;
    	canvas.height = dst.height;
    	let context = canvas.getContext('2d');
    	context.transform.apply(context, matrix);
        context.drawImage(image, src.left, src.top, src.width, src.height, dst.left, dst.top, dst.width, dst.height);
    }

    extractMosaic() {
        let { canvas } = this.components;
        try {
            let miniCanvas = document.createElement('CANVAS');
            miniCanvas.width = 48;
            miniCanvas.height = 48;
            let miniContext = miniCanvas.getContext('2d');
            miniContext.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, miniCanvas.width, miniCanvas.height);
            let microCanvas = document.createElement('CANVAS');
            microCanvas.width = 4;
            microCanvas.height = 4;
            let microContext = microCanvas.getContext('2d');
            microContext.drawImage(miniCanvas, 0, 0, miniCanvas.width, miniCanvas.height, 0, 0, microCanvas.width, microCanvas.height);
            let imageData = microContext.getImageData(0, 0, microCanvas.width, microCanvas.height);
            let pixels = imageData.data;
            if (_.size(pixels) >= 64) {
                let colors = [];
                for (let i = 0; i < 16; i++) {
                    let r = pixels[i * 4 + 0];
                    let g = pixels[i * 4 + 1];
                    let b = pixels[i * 4 + 2];
                    let rgb = (r << 16) | (g << 8) | (b << 0);
                    colors.push(rgb.toString(16));
                }
                return colors;
            }
        } catch (err) {

        }
    }

    /**
     * Collapsed the canvas
     */
    clearCanvas() {
        let { canvas } = this.components;;
        if (canvas) {
            canvas.width = 0;
        	canvas.height = 0;
        }

        this.width = 0;
        this.height = 0;
        this.orientation = undefined;
    }
}

/**
 * Calculate inverse of affine matrix
 *
 * @param  {Array<Number>} m
 *
 * @return {Array<Number>}
 */
function invert(m) {
	let [a, b, c, d, e, f] = m;
	let dt = (a * d - b * c);
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
	let [a, b, c, d, e, f] = m;
	let [x, y] = p;
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
	let c1 = [ r.left, r.top ];
	let c2 = [ r.left + r.width, r.top + r.height ];
	c1 = transform(m, c1);
	c2 = transform(m, c2);
	return {
		width: Math.abs(c2[0] - c1[0]),
		height: Math.abs(c2[1] - c1[1]),
		left: Math.min(c2[0], c1[0]),
		top: Math.min(c2[1], c1[1]),
	};
}

export {
    BitmapView as default,
    BitmapView,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    BitmapView.propTypes = {
        url: PropTypes.string,
        clippingRect: PropTypes.object,
        onLoad: PropTypes.func,
        onError: PropTypes.func,
    };
}
