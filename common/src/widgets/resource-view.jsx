import _ from 'lodash';
import React, { Component } from 'react';
import * as MediaLoader from 'media/media-loader';
import * as ImageCropping from 'media/image-cropping';

import BitmapView from 'media/bitmap-view';
import VectorView from 'media/vector-view';

require('./resource-view.scss');

class ResourceView extends Component {
    static displayName = 'ResourceView';

    constructor(props) {
        super(props);
        this.state = {
            waitingForRemoteImage: false,
            remoteImageLoaded: false,
        };
    }

    /**
     * Return URL of image
     *
     * @param  {Object} props
     *
     * @return {String|undefined}
     */
    getURL(props) {
        let { env, animation, resource, url, clip, width, height } = props || this.props;
        if (resource) {
            let params = {};
            if (animation && resource.format === 'gif') {
                // use the original file when it's a gif and we wish to show animation
                params.original = true;
            } else {
                if (!clip) {
                    // don't apply clip rectangle
                    params.clip = null;
                }
                if (width) {
                    // resize source image
                    params.width = width;
                }
                if (height) {
                    // ditto
                    params.height = height;
                }
            }
            return env.getImageURL(resource, params);
        } else {
            return url;
        }
    }

    /**
     * Return image dimensions
     *
     * @param  {Object} props
     *
     * @return {Object}
     */
    getDimensions(props) {
        let { env, resource, width, height, clip } = props || this.props;
        if (resource) {
            let dims = env.getImageDimensions(resource, {
                original: !clip
            });
            if (width) {
                height = Math.round(width * dims.height / dims.width);
            } else if (height) {
                width = Math.round(height * dims.width / dims.height);
            } else {
                width = dims.width;
                height = dims.height;
            }
        }
        return { width, height };
    }

    /**
     * Check if we're switching for showing blob to showing remote file
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { resource } = this.props;
        if (nextProps.resource !== resource) {
            let urlBefore = this.getURL();
            let urlAfter = this.getURL(nextProps);
            if (isJSONEncoded(urlBefore) && !isJSONEncoded(urlAfter)) {
                this.setState({ waitingForRemoteImage: true });
                MediaLoader.loadImage(urlAfter).catch((err) => {
                }).then(() => {
                    this.setState({ waitingForRemoteImage: false });
                });
            }
        }
    }

    /**
     * Suppress update while remote image is loading
     *
     * @param  {Object} nextProps
     * @param  {Object} nextState
     *
     * @return {Boolean}
     */
    shouldComponentUpdate(nextProps, nextState) {
        if (nextState.waitingForRemoteImage) {
            return false;
        }
        return true;
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { resource, width, height, clip, showMosaic, children } = this.props;
        let { remoteImageLoaded } = this.state;
        let url = this.getURL();
        if (!url) {
            return children || null;
        }
        let props = _.omit(this.props, 'clip', 'animation', 'showMosaic', 'resource', 'url', 'width', 'height', 'env');
        if (isJSONEncoded(url)) {
            let image = parseJSONEncodedURL(url);
            props.url = image.url;
            props.clippingRect = image.clip;
            if (image.format === 'svg') {
                return <VectorView {...props} />;
            } else {
                return <BitmapView {...props} />;
            }
        } else {
            let containerProps = {
                className: 'resource-view'
            };
            let dims = this.getDimensions();
            props.src = url;
            props.width = dims.width;
            props.height = dims.height;
            if (!remoteImageLoaded && showMosaic) {
                props.onLoad = this.handleRemoteImageLoad;

                let heightToWidthRatio = height / width;
                containerProps.className += ' loading';
                containerProps.style = {
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
                    containerProps.style.backgroundRepeat = 'no-repeat';
                    containerProps.style.backgroundSize = `100% 25.5%`;
                    containerProps.style.backgroundImage = gradients.join(', ');
                    containerProps.style.backgroundPosition = positions.join(', ');
                }
            }
            return (
                <span {...containerProps}>
                    <img {...props} />
                </span>
            );
        }
    }

    /**
     * Called when remote image is done loading
     *
     * @param  {Event} Evt
     */
    handleRemoteImageLoad = (evt) => {
        this.setState({ remoteImageLoaded: true });
    }
}

function isJSONEncoded(url) {
    return _.startsWith(url, 'json:');
}

function parseJSONEncodedURL(url) {
    let json = url.substr(5);
    return JSON.parse(json);
}

function formatColor(color) {
    if (color.length < 6) {
        color = '000000'.substr(color.length) + color;
    }
    return '#' + color;
}

ResourceView.defaultProps = {
    clip: true,
    animation: false,
    showMosaic: false,
};

export {
    ResourceView as default,
    ResourceView,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ResourceView.propTypes = {
        clip: PropTypes.bool,
        animation: PropTypes.bool,
        showMosaic: PropTypes.bool,
        resource: PropTypes.object,
        url: PropTypes.string,
        width: PropTypes.number,
        height: PropTypes.number,
        env: PropTypes.instanceOf(Environment),
    };
}
