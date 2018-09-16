import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as BlobManager from 'transport/blob-manager';
import Payload from 'transport/payload';
import * as ImageCropping from 'media/image-cropping';
import * as FocusManager from 'utils/focus-manager';
import ComponentRefs from 'utils/component-refs';

import Environment from 'env/environment';

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
        this.prepareImage(this.props.resource, this.props.disabled);
    }

    /**
     * Prepare the image when it changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        if (this.props.resource !== nextProps.resource || this.props.disabled !== nextProps.disabled) {
            this.prepareImage(nextProps.resource, nextProps.disabled);
        }
    }

    /**
     * Load the image if it isn't available locally
     *
     * @param  {Object} res
     * @param  {Boolean} disabled
     */
    prepareImage(res, disabled) {
        let newState = {
            fullImageURL: null,
            previewImageURL: null,
            placeholderMessage: null,
            placeholderIcon: null,
        };
        let fullImageRemoteURL = this.props.theme.getImageURL(res, { original: true });
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
                newState.previewImageURL = this.props.theme.getImageURL(res, {
                    width: this.props.previewWidth,
                    height: this.props.previewHeight
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
            let t = this.props.locale.translate;
            if (res.width && res.height) {
                // when the dimensions are known, then the image was available to
                // the client
                newState.placeholderMessage = t('image-editor-upload-in-progress');
                newState.placeholderIcon = 'cloud-upload';
            } else {
                if (!res.pending) {
                    // not pending locally--we're wait for remote action to complete
                    if (res.type === 'video') {
                        // poster is being generated in the backend
                        newState.placeholderMessage = t('image-editor-poster-extraction-in-progress');
                        newState.placeholderIcon = 'film';
                    } else if (res.type === 'website') {
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
        return (
            <div className="image-editor">
                {this.renderImage()}
                {this.renderSpinner()}
                {this.props.children}
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
        if (this.state.fullImageURL) {
            return this.renderImageCropper();
        } else if (this.state.previewImageURL) {
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
        let className = 'preview';
        if (this.props.disabled) {
            className += ' disabled';
        }
        let imageProps = {
            src: this.state.previewImageURL,
            width: this.props.previewWidth,
            height: this.props.previewHeight
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
        if (this.props.disabled) {
            return null;
        }
        if (this.state.plaeholderMessage || this.state.placeholderIcon) {
            return null;
        } else if (this.state.fullImageURL) {
            if (this.state.fullImageURL === this.state.loadedImageURL) {
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
        let setters = this.components.setters;
        let res = this.props.resource;
        let props = {
            ref: setters.imageCropper,
            url: this.state.fullImageURL,
            clippingRect: res.clip || ImageCropping.apply(res.width, res.height),
            vector: (res.format === 'svg'),
            disabled: this.props.disabled,
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
        if (this.state.fullImageURL || this.state.previewImageURL) {
            return null;
        }
        if (!this.state.plaeholderMessage && !this.state.placeholderIcon) {
            return null;
        }
        return (
            <div className="placeholder">
                <div className="icon">
                    <i className={`fa fa-${this.state.placeholderIcon}`} />
                </div>
                <div className="message">{this.state.placeholderMessage}</div>
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
        let imageCropper = this.components.imageCropper;
        if (imageCropper) {
            imageCropper.focus();
        }
    }

    triggerChangeEvent(res) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                resource: res
            });
        }
    }

    /**
     * Called after user has made adjustments to an image's clipping rect
     *
     * @param  {Object} evt
     */
    handleClipRectChange = (evt) => {
        let res = _.clone(this.props.resource);
        res.clip = evt.rect;
        res.mosaic = evt.target.extractMosaic();
        this.triggerChangeEvent(res);
    }

    /**
     * Called when ImageView has loaded the full image
     *
     * @param  {Object} evt
     */
    handleFullImageLoad = (evt) => {
        let url = evt.target.props.url;
        this.setState({ loadedImageURL: url });

        // set mosaic if there isn't one
        let res = _.clone(this.props.resource);
        if (!res.mosaic) {
            res.mosaic = this.components.imageCropper.extractMosaic();
            this.triggerChangeEvent(res);
        }
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
