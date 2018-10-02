import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as BlobManager from 'transport/blob-manager';
import Payload from 'transport/payload';
import * as ImageCropping from 'media/image-cropping';
import * as FocusManager from 'utils/focus-manager';
import ComponentRefs from 'utils/component-refs';

// widgets
import ImageCropper from 'widgets/image-cropper';

import './image-editor.scss';

class ImageEditor extends PureComponent {
    static displayName = 'ImageEditor';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            imageCropper: ImageCropper,
        });
        this.state = {
            fullImageURL: null,
            loadedImageURL: null,
            previewImageURL: null,
            placeholderMessage: null,
            placeholderIcon: null,
        };
    }

    /**
     * Prepare the image on mount
     */
    componentWillMount() {
        let { resource, disabled } = this.props;
        this.prepareImage(resource, disabled);
    }

    /**
     * Prepare the image when it changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { resource, disabled } = this.props;
        if (nextProps.resource !== resource || nextProps.disabled !== disabled) {
            this.prepareImage(nextProps.resource, nextProps.disabled);
        }
    }

    /**
     * Load the image if it isn't available locally
     *
     * @param  {Object} resource
     * @param  {Boolean} disabled
     */
    prepareImage(resource, disabled) {
        let { env, previewWidth, previewHeight } = this.props;
        let { t } = env.locale;
        let newState = {
            fullImageURL: null,
            previewImageURL: null,
            placeholderMessage: null,
            placeholderIcon: null,
        };
        let fullImageRemoteURL = env.getImageURL(resource, { original: true });
        if (fullImageRemoteURL) {
            if (isJSONEncoded(fullImageRemoteURL)) {
                // a blob that hasn't been uploaded yet
                let image = parseJSONEncodedURL(fullImageRemoteURL)
                newState.fullImageURL = image.url;
            } else {
                // the remote URL might point to a file we had uploaded
                let blob = BlobManager.find(fullImageRemoteURL);
                if (blob) {
                    newState.fullImageURL = BlobManager.url(blob);
                }
            }
            if (!newState.fullImageURL) {
                // we don't have a blob--show a preview image (clipped) while the
                // full image is retrieved
                newState.previewImageURL = env.getImageURL(resource, {
                    width: previewWidth,
                    height: previewHeight
                });

                // load it, unless control is disabled
                if (!disabled) {
                    BlobManager.fetch(fullImageRemoteURL).then((blob) => {
                        this.setState({
                            fullImageURL: BlobManager.url(blob),
                            previewImageURL: null,
                            placeholderMessage: null,
                            placeholderIcon: null,
                        });
                    });
                }
            }
        }
        if (!newState.fullImageURL && !newState.previewImageURL) {
            // image isn't available locally
            if (resource.width && resource.height) {
                // when the dimensions are known, then the image was available to
                // the client
                newState.placeholderMessage = t('image-editor-upload-in-progress');
                newState.placeholderIcon = 'cloud-upload';
            } else {
                if (!resource.pending) {
                    // not pending locally--we're wait for remote action to complete
                    if (resource.type === 'video') {
                        // poster is being generated in the backend
                        newState.placeholderMessage = t('image-editor-poster-extraction-in-progress');
                        newState.placeholderIcon = 'film';
                    } else if (resource.type === 'website') {
                        // web-site preview is being generated
                        newState.placeholderMessage = t('image-editor-page-rendering-in-progress');
                        newState.placeholderIcon = 'file-image-o';
                    }
                }
            }
        }
        if (!_.isMatch(this.state, newState)) {
            this.setState(newState);
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { children } = this.props
        return (
            <div className="image-editor">
                {this.renderImage()}
                {this.renderSpinner()}
                {children}
            </div>
        );
    }

    /**
     * Render image cropper if full image is available; otherwise render
     * preview image
     *
     * @return {ReactElement}
     */
    renderImage() {
        let { fullImageURL, previewImageURL } = this.state;
        if (fullImageURL) {
            return this.renderImageCropper();
        } else if (previewImageURL) {
            return this.renderPreviewImage();
        } else {
            return this.renderPlaceholder();
        }
    }

    /**
     * Render preview image when we don't have the full image yet
     *
     * @return {ReactElement}
     */
    renderPreviewImage() {
        let { previewWidth, previewHeight, disabled } = this.props;
        let { previewImageURL } = this.state;
        let className = 'preview';
        if (disabled) {
            className += ' disabled';
        }
        let imageProps = {
            src: previewImageURL,
            width: previewWidth,
            height: previewHeight
        };
        return (
            <div className={className}>
                <img {...imageProps} />
            </div>
        );
    }

    /**
     * Render a spinner until full image is loaded
     *
     * @return {ReactElement|null}
     */
    renderSpinner() {
        let { disabled } = this.props;
        let {
            plaeholderMessage,
            placeholderIcon,
            fullImageURL,
            loadedImageURL
        } = this.state;
        if (disabled) {
            return null;
        }
        if (plaeholderMessage || placeholderIcon) {
            return null;
        } else if (fullImageURL) {
            if (fullImageURL === loadedImageURL) {
                return null;
            }
        }
        return (
            <div className="spinner">
                <i className="fa fa-refresh fa-spin fa-fw" />
            </div>
        );
    }

    /**
     * Render image with cropping handling
     *
     * @return {ReactElement}
     */
    renderImageCropper() {
        let { resource, disabled } = this.props;
        let { fullImageURL } = this.state;
        let { setters } = this.components;
        let props = {
            ref: setters.imageCropper,
            url: fullImageURL,
            clippingRect: resource.clip || ImageCropping.apply(resource.width, resource.height),
            vector: (resource.format === 'svg'),
            disabled,
            onChange: this.handleClipRectChange,
            onLoad: this.handleFullImageLoad,
        };
        return <ImageCropper {...props} />;
    }

    /**
     * Render message when image isn't available yet
     *
     * @return {ReactELement|null}
     */
    renderPlaceholder() {
        let {
            placeholderMessage,
            placeholderIcon,
            fullImageURL,
            previewImageURL
        } = this.state;
        if (fullImageURL || previewImageURL) {
            return null;
        }
        if (!placeholderMessage && !placeholderIcon) {
            return null;
        }
        return (
            <div className="placeholder">
                <div className="icon">
                    <i className={`fa fa-${placeholderIcon}`} />
                </div>
                <div className="message">{placeholderMessage}</div>
            </div>
        );
    }

    /**
     * Register component with FocusManager so focus can be set by other
     */
    componentDidMount() {
        FocusManager.register(this, {
            type: 'ImageEditor',
        });
    }

    /**
     * Unregister component
     */
    componentWillUnmount() {
        FocusManager.unregister(this);
    }

    /**
     * Focus image cropper
     */
    focus() {
        let { imageCropper } = this.components;
        if (imageCropper) {
            imageCropper.focus();
        }
    }

    triggerChangeEvent(resource) {
        let { onChange } = this.props;
        if (onChange) {
            onChange({
                type: 'change',
                target: this,
                resource
            });
        }
    }

    /**
     * Called after user has made adjustments to an image's clipping rect
     *
     * @param  {Object} evt
     */
    handleClipRectChange = (evt) => {
        let { resource } = this.props;
        let { imageCropper } = this.components;
        resource = _.clone(resource);
        resource.clip = evt.rect;
        this.triggerChangeEvent(resource);
    }

    /**
     * Called when ImageView has loaded the full image
     *
     * @param  {Object} evt
     */
    handleFullImageLoad = (evt) => {
        let { resource } = this.props;
        let { imageCropper } = this.components;
        let url = evt.target.props.url;
        this.setState({ loadedImageURL: url });
    }
}

function isJSONEncoded(url) {
    return _.startsWith(url, 'json:');
}

function parseJSONEncodedURL(url) {
    let json = url.substr(5);
    return JSON.parse(json);
}

ImageEditor.defaultProps = {
    previewWidth: 512,
    previewHeight: 512,
    disabled: false,
};

export {
    ImageEditor as default,
    ImageEditor,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ImageEditor.propTypes = {
        resource: PropTypes.object,
        env: PropTypes.instanceOf(Environment).isRequired,
        previewWidth: PropTypes.number,
        previewHeight: PropTypes.number,
        disabled: PropTypes.bool,
        onChange: PropTypes.func,
    };
}
