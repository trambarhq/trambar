var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var BlobManager = require('transport/blob-manager');
var Payload = require('transport/payload');
var ImageCropping = require('media/image-cropping');

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
            fullImageURL: null,
            previewImageURL: null,
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
    getFullImageURL: function(res) {
        var url = this.props.theme.getImageURL(res, { clip: null });
        if (!url) {
            url = Payload.getImageURL(res);
        }
        return url;
    },

    /**
     * Return URL to preview image
     *
     * @param  {Object} res
     *
     * @return {String|null}
     */
    getPreviewImageURL: function(res) {
        var theme = this.props.theme;
        var previewURL = theme.getImageURL(res, {
            width: this.props.previewWidth,
            height: this.props.previewHeight
        });
    },

    /**
     * Load the image if it isn't available locally
     *
     * @param  {Object} res
     */
    prepareImage: function(res) {
        var fullImageURL = this.getFullImageURL(res);
        var previewImageURL = null;
        var blobURL = BlobManager.find(fullImageURL);
        if (blobURL) {
            fullImageURL = blobURL;
        } else {
            previewImageURL = this.getPreviewImageURL(res);
            if (this.state.fullImageURL !== fullImageURL) {
                // load it
                BlobManager.fetch(fullImageURL).then((blobURL) => {
                    this.setState({
                        fullImageURL: blobURL,
                        previewImageURL: null
                    });
                });
            }
        }
        if (this.state.fullImageURL !== fullImageURL || this.state.previewImageURL !== previewImageURL) {
            this.setState({ fullImageURL, previewImageURL });
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
        if (!this.state.previewImageURL) {
            return null;
        }
        return <img className="preview" src={this.state.previewImageURL} />;
    },

    /**
     * Render image with cropping handling
     *
     * @return {ReactElement|null}
     */
    renderImageCropper: function() {
        if (!this.state.fullImageURL || this.state.previewImageURL) {
            return null;
        }
        var res = this.props.resource;
        var props = {
            url: this.state.fullImageURL,
            clippingRect: res.clip || ImageCropping.default(res.width, res.height),
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
        if (this.state.fullImageURL || this.state.previewImageURL) {
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
