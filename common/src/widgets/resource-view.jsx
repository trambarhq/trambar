import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as BlobManager from 'transport/blob-manager';
import * as ImageCropping from 'media/image-cropping';
import * as ResourceUtils from 'objects/utils/resource-utils';

import BitmapView from 'widgets/bitmap-view';
import VectorView from 'widgets/vector-view';

require('./resource-view.scss');

/**
 * A component for displaying a media resource (image, video, audio, web-link).
 * It's capable of displaying local files that have just need selected for
 * uploading to remote server.
 *
 * @extends {PureComponent}
 */
class ResourceView extends PureComponent {
    static displayName = 'ResourceView';

    constructor(props) {
        super(props);
        this.state = {
            loadingRemoteImage: '',
            remoteImageLoaded: '',
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { children } = this.props;
        let { remoteImageLoaded } = this.state;
        let localURL = this.getLocalImageURL();
        let remoteURL = this.getRemoteImageURL();
        // if we have a blob of the image, then it's just been uploaded
        // use it until we've loaded the remote copy
        if (localURL && (remoteImageLoaded !== remoteURL)) {
            return this.renderLocalImage();
        } else if (remoteURL) {
            return this.renderRemoteImage();
        } else {
            return children || null;
        }
    }

    /**
     * Render image stored at server
     *
     * @return {ReactElement}
     */
    renderRemoteImage() {
        let { resource, width, height, clip, showMosaic } = this.props;
        let { remoteImageLoaded } = this.state;
        let url = this.getRemoteImageURL();
        let dims = ResourceUtils.getImageDimensions(resource, {
            original: !clip
        });
        let props = _.omit(this.props, propNames);
        if (width) {
            props.height = Math.round(width * dims.height / dims.width);
        } else if (height) {
            props.width = Math.round(height * dims.width / dims.height);
        } else {
            props.width = dims.width;
            props.height = dims.height;
        }
        props.src = url;
        let containerProps = {
            className: 'resource-view'
        };
        if (!remoteImageLoaded && showMosaic) {
            containerProps.className += ' loading';
            containerProps.style = this.getMosaicStyle();
            props.onLoad = this.handleRemoteImageLoad;
        }
        return (
            <div {...containerProps}>
                <img {...props} />
            </div>
        );
    }

    /**
     * Render an image stored in a blob
     *
     * @return {ReactElement}
     */
    renderLocalImage() {
        let { env, resource, clip, width, height } = this.props;
        let url = this.getLocalImageURL();
        let clippingRect = (clip) ? ResourceUtils.getClippingRect(resource) : null;
        let props = _.omit(this.props, propNames);
        props.url = url;
        props.clippingRect = clippingRect;
        props.width = width;
        props.height = height;
        if (resource.format === 'svg') {
            return <VectorView {...props} />;
        } else {
            return <BitmapView {...props} />;
        }
    }

    /**
     * Check for need to preload remote image on mount
     */
    componentDidMount() {
        this.componentDidUpdate();
    }

    /**
     * Check for need to preload remote image on update
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { remoteImageLoaded, loadingRemoteImage } = this.state;
        let localURL = this.getLocalImageURL();
        let remoteURL = this.getRemoteImageURL();
        if (localURL && remoteURL) {
            if (remoteImageLoaded !== remoteURL && loadingRemoteImage !== remoteURL) {
                // the image has just become available on the remote server
                // pre-cache it before switching from the local copy
                this.setState({ loadingRemoteImage: remoteURL });
                BlobManager.fetch(remoteURL).then(() => {
                    this.setState({ remoteImageLoaded: remoteURL });
                });
            }
        }
    }

    /**
     * Create background style showing a mosaic of the image
     *
     * @return {Object}
     */
    getMosaicStyle() {
        let { resource, clip, width, height } = this.props;
        let heightToWidthRatio = height / width;
        let style = {
            paddingTop: (heightToWidthRatio * 100) + '%'
        };
        let mosaic = _.get(resource, 'mosaic');
        if (clip && _.size(mosaic) === 16) {
            let scanlines = _.chunk(mosaic, 4);
            let gradients  = _.map(scanlines, (pixels) => {
                let [ c1, c2, c3, c4 ] = _.map(pixels, formatColor);
                return `linear-gradient(90deg, ${c1} 0%, ${c1} 25%, ${c2} 25%, ${c2} 50%, ${c3} 50%, ${c3} 75%, ${c4} 75%, ${c4} 100%)`;
            });
            let positions = [ `0 0%`, `0 ${100 / 3}%`, `0 ${200 / 3}%`, `0 100%` ];
            style.backgroundRepeat = 'no-repeat';
            style.backgroundSize = `100% 25.5%`;
            style.backgroundImage = gradients.join(', ');
            style.backgroundPosition = positions.join(', ');
        }
        return style;
    }

    /**
     * Return URL to clipped image from server
     *
     * @return {String|undefined}
     */
    getRemoteImageURL() {
        let { env, resource, width, height, clip, showAnimation } = this.props;
        let params = { remote: true };
        if (showAnimation && resource.format === 'gif') {
            // use the original file when it's a gif and we wish to show animation
            params.original = true;
        } else {
            if (!clip) {
                // don't apply clip rectangle
                params.clip = null;
            }
            // resize source image
            params.width = width;
            params.height = height;
        }
        return ResourceUtils.getImageURL(resource, params, env);
    }

    /**
     * Return URL to file just uploaded by the user
     *
     * @return {String}
     */
    getLocalImageURL() {
        let { env, resource } = this.props;
        let params = { local: true, original: true };
        return ResourceUtils.getImageURL(resource, params, env);
    }

    /**
     * Called when remote image is done loading
     *
     * @param  {Event} Evt
     */
    handleRemoteImageLoad = (evt) => {
        let url = evt.target.getAttribute('src');
        this.setState({ remoteImageLoaded: url });
    }
}

function formatColor(color) {
    if (color.length < 6) {
        color = '000000'.substr(color.length) + color;
    }
    return '#' + color;
}

ResourceView.defaultProps = {
    clip: true,
    showAnimation: false,
    showMosaic: false,
};

const propNames = [
    'resource',
    'width',
    'height',
    'clip',
    'showAnimation',
    'showMosaic',
    'env'
];

export {
    ResourceView as default,
    ResourceView,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ResourceView.propTypes = {
        resource: PropTypes.object.isRequired,
        width: PropTypes.number,
        height: PropTypes.number,
        clip: PropTypes.bool,
        showAnimation: PropTypes.bool,
        showMosaic: PropTypes.bool,
        env: PropTypes.instanceOf(Environment),
    };
}
