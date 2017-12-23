var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ImageCropper = require('media/image-cropper');

require('./image-editor.scss');

module.exports = React.createClass({
    displayName: 'ImageEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        resource: PropTypes.object,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        previewWidth: PropTypes.number,
        previewHeight: PropTypes.number,
        onChange: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            previewWidth: 512,
            previewHeight: 512,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var nextState = {};
        this.updateUrls(nextState, this.props);
        return nextState;
    },

    /**
     * Update state when
     *
     * @param  {[type]} nextProps
     *
     * @return {[type]}
     */
    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.resource !== nextProps.resource) {
            this.updateUrls(nextState, nextProps);
        }
        var changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    /**
     * Update URLs in state using props.resource
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateUrls: function(nextState, nextProps) {
        var imageUrlBefore = nextState.imageUrl;
        var res = nextProps.resource;
        var theme = nextProps.theme;
        var file = theme.getImageFile(res);
        if (file) {
            // don't download files that we'd earlier uploaded
            nextState.imageUrl = URL.createObjectURL(file);
            nextState.previewUrl = null;
        } else {
            // download the original file, unclipped
            nextState.imageUrl = theme.getImageUrl(res, {
                clip: null
            });
            // show a smaller, clipped image in the meantime
            nextState.previewUrl = theme.getImageUrl(res, {
                width: this.props.previewWidth,
                height: this.props.previewHeight,
                clip: res.clip || getDefaultClippingRect(res.width, res.height),
            });
        }
        if (nextState.imageUrl !== imageUrlBefore) {
            nextState.imageLoaded = loaded[nextState.imageUrl];
        }
    },

    render: function() {
        return (
            <div className="image-editor">
                {this.renderPlaceholder()}
                {this.renderImageCropper()}
                {this.renderPreview()}
                {this.props.children}
            </div>
        );
    },

    /**
     * Render preview image while actual image is loading
     *
     * @return {ReactElement|null}
     */
    renderPreview: function() {
        if (!this.state.previewUrl || this.state.imageLoaded) {
            return null;
        }
        return <img className="preview" src={this.state.previewUrl} />;
    },

    /**
     * Render image with cropping handling
     *
     * @return {ReactElement|null}
     */
    renderImageCropper: function() {
        if (!this.state.imageUrl) {
            return null;
        }
        var res = this.props.resource;
        var props = {
            url: this.state.imageUrl,
            clippingRect: res.clip || getDefaultClippingRect(res.width, res.height),
            onChange: this.handleClipRectChange,
            onLoad: this.handleImageLoad,
        };
        return <ImageCropper {...props} />;
    },

    /**
     * Render message when image isn't available yet
     *
     * @return {ReactELement|null}
     */
    renderPlaceholder: function() {
        if (this.state.imageUrl) {
            return null;
        }
        var t = this.props.locale.translate;
        return (
            <div className="placeholder">
                <div className="message">
                    {t('image-editor-upload-in-progress')}
                </div>
            </div>
        );
    },

    triggerChangeEvent: function(res) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                resource: res
            });
        }
    },

    /**
     * Called after user has made adjustments to an image's clipping rect
     *
     * @param  {Object} evt
     *
     * @return {Promise<Story>}
     */
    handleClipRectChange: function(evt) {
        var res = _.clone(this.props.resource);
        res.clip = evt.rect;
        return this.triggerChangeEvent(res);
    },

    /**
     * Called when ImageCropper has loaded the image
     *
     * @param  {Object} evt
     *
     */
    handleImageLoad: function(evt) {
        var url = evt.target.props.url;
        if (this.state.imageUrl === url) {
            this.setState({ imageLoaded: true });
        }
        loaded[url] = true;
    },
});

var loaded = {};

/**
 * Return a square clipping rect
 *
 * @param  {Number} width
 * @param  {Number} height
 * @param  {String} align
 *
 * @return {Object}
 */
function getDefaultClippingRect(width, height, align) {
    var left = 0, top = 0;
    var length = Math.min(width, height);
    if (align === 'center' || !align) {
        if (width > length) {
            left = Math.floor((width - length) / 2);
        } else if (height > length) {
            top = Math.floor((height - length) / 2);
        }
    }
    return { left, top, width: length, height: length };
}
