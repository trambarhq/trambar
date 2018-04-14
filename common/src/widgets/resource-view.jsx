var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
var ImageCropping = require('media/image-cropping');

var Payload = require('transport/payload');
var Theme = require('theme/theme');
var BitmapView = require('media/bitmap-view');
var VectorView = require('media/vector-view');

module.exports = React.createClass({
    displayName: 'ResourceView',
    propTypes: {
        clip: PropTypes.bool,
        animation: PropTypes.bool,
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
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            isWaitingForImage: false
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
                this.setState({ isWaitingForImage: true });
                MediaLoader.loadImage(urlAfter).catch((err) => {
                }).then(() => {
                    this.setState({ isWaitingForImage: false });
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
        if (nextState.isWaitingForImage) {
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
        var props = _.omit(this.props, 'clip', 'animation', 'resource', 'url', 'width', 'height', 'theme');
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
            var dims = this.getDimensions();
            props.src = url;
            props.width = dims.width;
            props.height = dims.height;
            return <img {...props} />;
        }
    },
});

function isJSONEncoded(url) {
    return _.startsWith(url, 'json:');
}

function parseJSONEncodedURL(url) {
    var json = url.substr(5);
    return JSON.parse(json);
}
