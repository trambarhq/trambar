var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var BlobManager = require('transport/blob-manager');

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
        return {
            fullImageUrl: null,
            previewImageUrl: null,
        };
    },

    /**
     * Prepare the image on mount
     */
    componentWillMount: function() {
        this.prepareImage(this.props.resource);
    },

    /**
     * Prepare the image when it changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.resource !== nextProps.resource) {
            this.prepareImage(nextProps.resource);
        }
    },

    /**
     * Return URL to full image
     *
     * @param  {Object} res
     *
     * @return {String|null}
     */
    getFullImageUrl: function(res) {
        // use file we had uploaded earlier if it's there
        var theme = this.props.theme;
        var fileUrl = theme.getImageFile(res);
        if (fileUrl && BlobManager.get(fileUrl)) {
            return fileUrl;
        }
        return theme.getImageUrl(res, { clip: null });
    },

    /**
     * Return URL to preview image
     *
     * @param  {Object} res
     *
     * @return {String|null}
     */
    getPreviewImageUrl: function(res) {
        var theme = this.props.theme;
        var previewUrl = theme.getImageUrl(res, {
            width: this.props.previewWidth,
            height: this.props.previewHeight,
            clip: res.clip || getDefaultClippingRect(res.width, res.height),
        });
    },

    /**
     * Load the image if it isn't available locally
     *
     * @param  {Object} res
     */
    prepareImage: function(res) {
        var fullImageUrl = this.getFullImageUrl(res);
        var previewImageUrl = null;
        var blobUrl = BlobManager.find(fullImageUrl);
        if (blobUrl) {
            fullImageUrl = blobUrl;
        } else {
            previewImageUrl = this.getPreviewImageUrl(res);
            if (this.state.fullImageUrl !== fullImageUrl) {
                // load it
                BlobManager.fetch(fullImageUrl).then((blobUrl) => {
                    this.setState({
                        fullImageUrl: blobUrl,
                        previewImageUrl: null
                    });
                });
            }
        }
        if (this.state.fullImageUrl !== fullImageUrl || this.state.previewImageUrl !== previewImageUrl) {
            this.setState({ fullImageUrl, previewImageUrl });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
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
        if (!this.state.previewImageUrl) {
            return null;
        }
        return <img className="preview" src={this.state.previewImageUrl} />;
    },

    /**
     * Render image with cropping handling
     *
     * @return {ReactElement|null}
     */
    renderImageCropper: function() {
        if (!this.state.fullImageUrl || this.state.previewImageUrl) {
            return null;
        }
        var res = this.props.resource;
        var props = {
            url: this.state.fullImageUrl,
            clippingRect: res.clip || getDefaultClippingRect(res.width, res.height),
            onChange: this.handleClipRectChange,
        };
        return <ImageCropper {...props} />;
    },

    /**
     * Render message when image isn't available yet
     *
     * @return {ReactELement|null}
     */
    renderPlaceholder: function() {
        if (this.state.fullImageUrl || this.state.previewImageUrl) {
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
});

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
