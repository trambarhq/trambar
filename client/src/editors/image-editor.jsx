import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as BlobManager from 'common/transport/blob-manager.mjs';
import Payload from 'common/transport/payload.mjs';
import * as ImageCropping from 'common/media/image-cropping.mjs';
import * as FocusManager from 'common/utils/focus-manager.mjs';
import * as ResourceUtils from 'common/objects/utils/resource-utils.mjs';
import ComponentRefs from 'common/utils/component-refs.mjs';

// widgets
import ImageCropper from 'common/widgets/image-cropper.jsx';

import './image-editor.scss';

/**
 * Component for adjusting an image's clipping rect (which controls the zoom
 * level as well). Contains logics for loading the full image, either an
 * local image that was selected by the user or an image that was uploaded
 * previously.
 *
 * @extends PureComponent
 */
class ImageEditor extends PureComponent {
    static displayName = 'ImageEditor';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            imageCropper: ImageCropper,
        });
        this.state = {
            loadingFullImage: '',
            fullImageLoaded: '',
        };
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
        let localURL = this.getLocalImageURL();
        let previewURL = this.getPreviewImageURL();
        if (localURL) {
            return this.renderImageCropper();
        } else if (previewURL) {
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
        let previewURL = this.getPreviewImageURL();
        let className = 'preview';
        if (disabled) {
            className += ' disabled';
        }
        let imageProps = {
            src: previewURL,
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
        if (disabled) {
            return null;
        }
        let localURL = this.getLocalImageURL();
        let previewURL = this.getPreviewImageURL();
        if (localURL || !previewURL) {
            return null;
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
        let { setters } = this.components;
        let url = this.getLocalImageURL();
        let clippingRect = ResourceUtils.getClippingRect(resource, {});
        let props = {
            ref: setters.imageCropper,
            url,
            clippingRect,
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
        let { env, resource } = this.props;
        let { t } = env.locale;
        let message, icon;
        if (resource.width && resource.height) {
            // when the dimensions are known, then the image was available to
            // the client
            message = t('image-editor-upload-in-progress');
            icon = 'cloud-upload';
        } else {
            if (!resource.pending) {
                // not pending locally--we're wait for remote action to complete
                if (resource.type === 'video') {
                    // poster is being generated in the backend
                    message = t('image-editor-poster-extraction-in-progress');
                    icon = 'film';
                } else if (resource.type === 'website') {
                    // web-site preview is being generated
                    message = t('image-editor-page-rendering-in-progress');
                    icon = 'file-image-o';
                } else if (resource.type === 'image') {
                    // image is being copied in the backend
                    message = t('image-editor-image-transfer-in-progress');
                    icon = 'file-image-o';
                }
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
    }

    /**
     * Register component with FocusManager so focus can be set by other
     */
    componentDidMount() {
        FocusManager.register(this, {
            type: 'ImageEditor',
        });
        this.componentDidUpdate();
    }

    /**
     * Retrieve full image if it's not there
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    async componentDidUpdate(prevProps, prevState) {
        let { loadingFullImage } = this.state;
        let localURL = this.getLocalImageURL();
        let remoteURL = this.getRemoteImageURL();
        if (!localURL && remoteURL) {
            if (loadingFullImage !== remoteURL) {
                this.setState({ loadingFullImage: remoteURL });
                await BlobManager.fetch(remoteURL);
                this.setState({ fullImageLoaded: remoteURL });
            }
        }
    }

    /**
     * Unregister component
     */
    componentWillUnmount() {
        FocusManager.unregister(this);
    }

    /**
     * Return URL to original image at server
     *
     * @return {String}
     */
    getRemoteImageURL() {
        let { env, resource } = this.props;
        let params = { remote: true, original: true };
        return ResourceUtils.getImageURL(resource, params, env);
    }

    /**
     * Return URL to blob, either downloaded again from server or a file
     * just selected by the user
     *
     * @return {String|undefined}
     */
    getLocalImageURL() {
        let { env, resource } = this.props;
        let params = { local: true, original: true };
        return ResourceUtils.getImageURL(resource, params, env);
    }

    /**
     * Return clipped version of image
     *
     * @return {String|undefined}
     */
    getPreviewImageURL() {
        let { env, resource, previewWidth, previewHeight } = this.props;
        let params = { remote: true, width: previewWidth, height: previewHeight };
        return ResourceUtils.getImageURL(resource, params, env);
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
        let url = evt.target.src;
        this.setState({ loadedImageURL: url });
    }
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

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ImageEditor.propTypes = {
        resource: PropTypes.object,
        previewWidth: PropTypes.number,
        previewHeight: PropTypes.number,
        disabled: PropTypes.bool,
        env: PropTypes.instanceOf(Environment).isRequired,
        onChange: PropTypes.func,
    };
}
