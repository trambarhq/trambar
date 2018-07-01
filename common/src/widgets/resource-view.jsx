var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
var ImageCropping = require('media/image-cropping');

var Payload = require('transport/payload');
var Theme = require('theme/theme');
var BitmapView = require('media/bitmap-view');
var VectorView = require('media/vector-view');

require('./resource-view.scss');

module.exports = React.createClass({
    displayName: 'ResourceView',
    propTypes: {
        clip: PropTypes.bool,
        animation: PropTypes.bool,
        mosaic: PropTypes.bool,
        resource: PropTypes.object,
        url: PropTypes.string,
        width: PropTypes.number,
        height: PropTypes.number,
        theme: PropTypes.instanceOf(Theme),
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            clip: true,
            animation: false,
            mosaic: false,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            waitingForRemoteImage: false,
            remoteImageLoaded: false,
        };
    },

    /**
     * Return URL of image
     *
     * @param  {Object} props
     *
     * @return {String|undefined}
     */
    getURL: function(props) {
        props = props || this.props;
        if (props.resource) {
            var params = {};
            if (props.animation && props.resource.format === 'gif') {
                // use the original file when it's a gif and we wish to show animation
                params.original = true;
            } else {
                if (!props.clip) {
                    // don't apply clip rectangle
                    params.clip = null;
                }
                if (props.width) {
                    // resize source image
                    params.width = props.width;
                }
                if (props.height) {
                    // ditto
                    params.height = props.height;
                }
            }
            return props.theme.getImageURL(props.resource, params);
        } else {
            return props.url;
        }
    },

    /**
     * Return image dimensions
     *
     * @param  {Object} props
     *
     * @return {Object}
     */
    getDimensions: function(props) {
        props = props || this.props;
        var width = props.width;
        var height = props.height;
        if (props.resource) {
            var dims = props.theme.getImageDimensions(props.resource, {
                original: !this.props.clip
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
    },

    /**
     * Check if we're switching for showing blob to showing remote file
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.resource !== nextProps.resource) {
            var urlBefore = this.getURL();
            var urlAfter = this.getURL(nextProps);
            if (isJSONEncoded(urlBefore) && !isJSONEncoded(urlAfter)) {
                this.setState({ waitingForRemoteImage: true });
                MediaLoader.loadImage(urlAfter).catch((err) => {
                }).then(() => {
                    this.setState({ waitingForRemoteImage: false });
                });
            }
        }
    },

    /**
     * Suppress update while remote image is loading
     *
     * @param  {Object} nextProps
     * @param  {Object} nextState
     *
     * @return {Boolean}
     */
    shouldComponentUpdate: function(nextProps, nextState) {
        if (nextState.waitingForRemoteImage) {
            return false;
        }
        return true;
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var url = this.getURL();
        if (!url) {
            return this.props.children || null;
        }
        var props = _.omit(this.props, 'clip', 'animation', 'mosaic', 'resource', 'url', 'width', 'height', 'theme');
        if (isJSONEncoded(url)) {
            var image = parseJSONEncodedURL(url);
            props.url = image.url;
            props.clippingRect = image.clip;
            if (image.format === 'svg') {
                return <VectorView {...props} />;
            } else {
                return <BitmapView {...props} />;
            }
        } else {
            var containerProps = {
                className: 'resource-view'
            };
            var dims = this.getDimensions();
            props.src = url;
            props.width = dims.width;
            props.height = dims.height;
            if (!this.state.remoteImageLoaded && this.props.mosaic) {
                props.onLoad = this.handleRemoteImageLoad;

                var heightToWidthRatio = props.height / props.width;
                containerProps.className += ' loading';
                containerProps.style = {
                    paddingTop: (heightToWidthRatio * 100) + '%'
                };
                var mosaic = _.get(this.props.resource, 'mosaic');
                if (this.props.clip && _.size(mosaic) === 16) {
                    var scanlines = _.chunk(mosaic, 4);
                    var gradients  = _.map(scanlines, (pixels) => {
                        var [ c1, c2, c3, c4 ] = _.map(pixels, formatColor);
                        return `linear-gradient(90deg, ${c1} 0%, ${c1} 25%, ${c2} 25%, ${c2} 50%, ${c3} 50%, ${c3} 75%, ${c4} 75%, ${c4} 100%)`;
                    });
                    var positions = [ `0 0%`, `0 ${100 / 3}%`, `0 ${200 / 3}%`, `0 100%` ];
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
    },

    /**
     * Called when remote image is done loading
     *
     * @param  {Event} Evt
     */
    handleRemoteImageLoad: function(Evt) {
        this.setState({ remoteImageLoaded: true });
    }
});

function isJSONEncoded(url) {
    return _.startsWith(url, 'json:');
}

function parseJSONEncodedURL(url) {
    var json = url.substr(5);
    return JSON.parse(json);
}

function formatColor(color) {
    if (color.length < 6) {
        color = '000000'.substr(color.length) + color;
    }
    return '#' + color;
}
