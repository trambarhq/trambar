import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as BlobManager from 'transport/blob-manager';
import * as BlobReader from 'transport/blob-reader';
import * as MediaLoader from 'media/media-loader';
import * as JPEGAnalyser from 'media/jpeg-analyser';
import * as ImageOrientation from 'media/image-orientation';
import ComponentRefs from 'utils/component-refs';

/**
 * A component that displays a bitmap image file (JPEG, PNG, etc.), with
 * correction for orientation flag.
 *
 * @extends {PureComponent}
 */
class BitmapView extends PureComponent {
    static displayName = 'BitmapView';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            canvas: HTMLCanvasElement,
        });
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { width, height } = this.props;
        let { setters } = this.components;
        let props = _.omit(this.props, 'onLoad', 'url', 'clippingRect');
        // give empty canvas a size so it scale correctly when empty
        props.width = 4;
        props.height = 4;
        return <canvas ref={setters.canvas} {...props} />
    }

    /**
     * Load image on mount
     */
    componentDidMount() {
        this.load();
    }

    /**
     * Update image when URL or clipping rect changes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { url, clippingRect } = this.props;
        if (prevProps.url !== url) {
            this.load();
        } else if (prevProps.clippingRect !== clippingRect) {
            if (this.image) {
                this.drawImage();
            }
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
     * @return {Promise}
     */
    async load() {
        let { url } = this.props;
        if (url) {
            try {
                let blob = await BlobManager.fetch(url);
                // load the image and its bytes
                let image = await MediaLoader.loadImage(blob);
                let bytes = await BlobReader.loadUint8Array(blob);
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

                this.drawImage();
                this.triggerLoadEvent();
            } catch (err) {
                console.error(err)
                this.triggerErrorEvent(err);
            }
        } else {
            this.clearCanvas();
        }
    }

    /**
     * Set the canvas's dimensions and draw an image into it
     */
    drawImage() {
        let { clippingRect } = this.props;
        let { canvas } = this.components;
        let image = this.image;
        if (!image) {
            return;
        }
        if (!canvas) {
            this.redrawNeeded = true;
            return;
        }
        if (!clippingRect) {
            clippingRect = {
                left: 0,
                top: 0,
                width: this.naturalWidth,
                height: this.naturalHeight
            };
        }

        canvas.width = this.width = clippingRect.width;
    	canvas.height = this.height = clippingRect.height;
        let matrix = ImageOrientation.getOrientationMatrix(this.orientation, image.naturalWidth, image.naturalHeight);
        let inverse = ImageOrientation.invertMatrix(matrix);
    	let src = ImageOrientation.transformRect(inverse, clippingRect);
    	let dst = ImageOrientation.transformRect(inverse, { left: 0, top: 0, width: canvas.width, height: canvas.height });
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
