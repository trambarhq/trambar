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
     * Load the image if it isn't available locally
     *
     * @param  {Object} res
     */
    prepareImage: function(res) {
        var fullImageURL = this.props.theme.getImageURL(res, { original: true });
        var hasBlob = false;
        if (isJSONEncoded(fullImageURL)) {
            // a blob that hasn't been uploaded yet
            var image = parseJSONEncodedURL(fullImageURL)
            fullImageURL = image.url;
            hasBlob = true;
        } else {
            // the remote URL might point to a file we had uploaded
            var blob = BlobManager.find(fullImageURL);
            if (blob) {
                fullImageURL = BlobManager.url(blob);
                hasBlob = true;
            }
        }
        var previewImageURL = null;
        if (!hasBlob) {
            // we don't have a blob--show a preview image (clipped) while the
            // full image is retrieved
            previewImageURL = this.props.theme.getImageURL(res, {
                width: this.props.previewWidth,
                height: this.props.previewHeight
            });
            if (this.state.fullImageURL !== fullImageURL) {
                // load it
                BlobManager.fetch(fullImageURL).then((blob) => {
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
        var setters = this.components.setters;
        var res = this.props.resource;
        var props = {
            ref: setters.imageCropper,
            url: this.state.fullImageURL,
            clippingRect: res.clip || ImageCropping.default(res.width, res.height),
            vector: (res.format === 'svg'),
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
