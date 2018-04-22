var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var BlobManager = require('transport/blob-manager');
var Payload = require('transport/payload');
var ImageCropping = require('media/image-cropping');
var FocusManager = require('utils/focus-manager');
var ComponentRefs = require('utils/component-refs');

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ImageCropper = require('widgets/image-cropper');

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
        disabled: PropTypes.bool,
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
            disabled: false,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            imageCropper: ImageCropper,
        });
        return {
            fullImageURL: null,
            previewImageURL: null,
        };
    },

    /**
     * Prepare the image on mount
     */
    componentWillMount: function() {
        this.prepareImage(this.props.resource, this.props.disabled);
    },

    /**
     * Prepare the image when it changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.resource !== nextProps.resource || this.props.disabled !== nextProps.disabled) {
            this.prepareImage(nextProps.resource, nextProps.disabled);
        }
    },

    /**
     * Load the image if it isn't available locally
     *
     * @param  {Object} res
     * @param  {Boolean} disabled
     */
    prepareImage: function(res, disabled) {
        var fullImageURL = null;
        var previewImageURL = null;
        var fullImageRemoteURL = this.props.theme.getImageURL(res, { original: true });
        if (isJSONEncoded(fullImageRemoteURL)) {
            // a blob that hasn't been uploaded yet
            var image = parseJSONEncodedURL(fullImageRemoteURL)
            fullImageURL = image.url;
        } else {
            // the remote URL might point to a file we had uploaded
            var blob = BlobManager.find(fullImageRemoteURL);
            if (blob) {
                fullImageURL = BlobManager.url(blob);
            }
        }
        if (!fullImageURL) {
            // we don't have a blob--show a preview image (clipped) while the
            // full image is retrieved
            previewImageURL = this.props.theme.getImageURL(res, {
                width: this.props.previewWidth,
                height: this.props.previewHeight
            });

            // load it, unless control is disabled
            if (!disabled) {
                BlobManager.fetch(fullImageRemoteURL).then((blob) => {
                    this.setState({
                        fullImageURL: BlobManager.url(blob),
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
                {this.renderImage()}
                {this.props.children}
            </div>
        );
    },

    /**
     * Render image cropper if full image is available; otherwise render
     * preview image
     *
     * @return {ReactElement}
     */
    renderImage: function() {
        if (!this.state.fullImageURL) {
            return this.renderPreviewImage();
        } else {
            return this.renderImageCropper();
        }
    },

    /**
     * Render preview image when we don't have the full image yet
     *
     * @return {ReactElement}
     */
    renderPreviewImage: function() {
        var className = 'preview';
        var overlay;
        if (this.props.disabled) {
            className += ' disabled';
        } else {
            overlay = (
                <div className="spinner">
                    <i className="fa fa-refresh fa-spin fa-fw" />
                </div>
            );
        }
        return (
            <div className={className}>
                <img src={this.state.previewImageURL} />
                {overlay}
            </div>
        );
    },

    /**
     * Render image with cropping handling
     *
     * @return {ReactElement}
     */
    renderImageCropper: function() {
        var setters = this.components.setters;
        var res = this.props.resource;
        var props = {
            ref: setters.imageCropper,
            url: this.state.fullImageURL,
            clippingRect: res.clip || ImageCropping.default(res.width, res.height),
            vector: (res.format === 'svg'),
            disabled: this.props.disabled,
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
        var res = this.props.resource;
        var message, icon;
        if (res.width && res.height) {
            // when the dimensions are known, then the image was available to
            // the client
            message = t('image-editor-upload-in-progress');
            icon = 'cloud-upload';
        } else {
            if (res.type === 'video') {
                // poster is being generated in the backend
                message = t('image-editor-poster-extraction-in-progress');
                icon = 'film';
            } else if (res.type === 'website') {
                // web-site preview is being generated
                message = t('image-editor-page-rendering-in-progress');
                icon = 'file-image-o';
            }
        }
        return (
            <div className="placeholder">
                <div className="icon">
                    <i className={`fa fa-${icon}`} />
                </div>
                <div className="message">{message}</div>
            </div>
        );
    },

    /**
     * Register component with FocusManager so focus can be set by other
     */
    componentDidMount: function() {
        FocusManager.register(this, {
            type: 'ImageEditor',
        });
    },

    /**
     * Unregister component
     */
    componentWillUnmount: function() {
        FocusManager.unregister(this);
    },

    /**
     * Focus image cropper
     */
    focus: function() {
        var imageCropper = this.components.imageCropper;
        if (imageCropper) {
            imageCropper.focus();
        }
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

function isJSONEncoded(url) {
    return _.startsWith(url, 'json:');
}

function parseJSONEncodedURL(url) {
    var json = url.substr(5);
    return JSON.parse(json);
}
