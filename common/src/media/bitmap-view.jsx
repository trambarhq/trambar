import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as BlobManager from 'transport/blob-manager';
import * as BlobReader from 'transport/blob-reader';
import * as MediaLoader from 'media/media-loader';
import * as JPEGAnalyser from 'media/jpeg-analyser';
import * as ImageOrientation from 'media/image-orientation';
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
    	let matrix = ImageOrientation.getOrientationMatrix(this.orientation, image.naturalWidth, image.naturalHeight);
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

        let inverse = ImageOrientation.invertMatrix(matrix);
    	let src = ImageOrientation.transformRect(inverse, rect);
    	let dst = ImageOrientation.transformRect(inverse, { left: 0, top: 0, width: rect.width, height: rect.height });
    	canvas.width = dst.width;
    	canvas.height = dst.height;
    	let context = canvas.getContext('2d');
    	context.transform.apply(context, matrix);
        context.drawImage(image, src.left, src.top, src.width, src.height, dst.left, dst.top, dst.width, dst.height);
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
