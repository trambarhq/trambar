import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as MediaLoader from 'media/media-loader';
import * as ResourceUtils from 'objects/utils/resource-utils';

// widgets
import ImageCroppingDialogBox from 'dialogs/image-cropping-dialog-box';
import ImageAlbumDialogBox from 'dialogs/image-album-dialog-box';
import ResourceView from 'widgets/resource-view';

import './image-selector.scss';

/**
 * Widget for selecting an image, either from the image album or from the
 * user's computer. When desiredWidth and desiredHeight are specified,
 * it provides the option to crop the selected image.
 *
 * @extends PureComponent
 */
class ImageSelector extends PureComponent {
    static displayName = 'ImageSelector';

    constructor(props) {
        super(props);
        this.state = {
            cropping: false,
            showingAlbum: false,
        };
    }

    /**
     * Return image object if there's one
     *
     * @return {Object|null}
     */
    getImage() {
        let { resources } = this.props;
        return _.find(resources, { type: 'image' });
    }

    /**
     * Update resource array and past it to parent component through an
     * onChange event
     *
     * @param  {Object} image
     */
    setImage(image) {
        let { resources, desiredWidth, desiredHeight, onChange } = this.props;
        if (desiredWidth && desiredHeight) {
            // center a clipping rect over the image if there's none
            if (!image.clip) {
                let ratio = desiredWidth / desiredHeight;
                let width = image.width;
                let height = Math.round(width / ratio);
                let left = 0;
                let top = Math.round((image.height - height) / 2);
                if (top < 0) {
                    height = image.height;
                    width = Math.round(height * ratio);
                    left = Math.round((image.width - width) / 2);
                    top = 0;
                }
                image = _.clone(image);
                image.clip = { left, top, width, height };
            }
        }
        resources = _.slice(resources);
        let index = _.findIndex(resources, { type: 'image' });
        if (index !== -1) {
            if (image) {
                resources[index] = image;
            } else {
                resources.splice(index, 1);
            }
        } else {
            resources.push(image);
        }
        this.value = resources;
        if (onChange) {
            onChange({
                type: 'change',
                target: this,
            });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { readOnly, children } = this.props;
        let classNames = [ 'image-selector' ];
        if (readOnly) {
            classNames.push('readonly')
        }
        return (
            <div className={classNames.join(' ')}>
                <label>{children}</label>
                <div className="contents">
                    {this.renderImage()}
                    {this.renderOptions()}
                </div>
                {this.renderCroppingDialogBox()}
                {this.renderAlbumDialogBox()}
            </div>
        );
    }

    /**
     * Render image or placeholder
     *
     * @return {ReactElement}
     */
    renderImage() {
        let { env, desiredWidth, desiredHeight } = this.props;
        let height = 120, width;
        let image = this.getImage();
        if (image) {
            let fullResURL = ResourceUtils.getImageURL(image, { clip: null, remote: true }, env);
            let linkProps = {
                href: fullResURL,
                target: '_blank',
                'data-width': image.width,
                'data-height': image.height,
                onClick: this.handleImageClick,
            };
            let viewProps = {
                resource: image,
                clip: !!(desiredWidth && desiredHeight),
                height: height,
                env,
            };
            return (
                <div className="image">
                    <a {...linkProps}>
                        <ResourceView {...viewProps} />
                    </a>
                </div>
            );
        } else {
            if (desiredWidth && desiredHeight) {
                width = Math.round(desiredWidth * height / desiredHeight);
            } else {
                width = 160;
            }
            return (
                <div className="image">
                    <div className="placeholder" style={{ width, height }}>
                        <i className="fa fa-photo" />
                    </div>
                </div>
            );
        }
    }

    /**
     * Render list of options
     *
     * @return {ReactElement}
     */
    renderOptions() {
        return (
            <div className="options">
                {this.renderChooseOption()}
                {this.renderUploadOption()}
                {this.renderResizeOption()}
            </div>
        )
    }

    /**
     * Render crop button if dimensions are specified
     *
     * @return {ReactElement|null}
     */
    renderResizeOption() {
        let { env, desiredWidth, desiredHeight, readOnly } = this.props;
        let { t } = env.locale;
        if (!desiredWidth || !desiredHeight) {
            return null;
        }
        let props = { className: 'option' };
        if (!readOnly) {
            props.onClick = this.handleCropClick;
        }
        let image = this.getImage();
        if (!image) {
            props.className += ' disabled';
        }
        return (
            <div {...props}>
                <i className="fa fa-crop" />
                {' '}
                {t('image-selector-crop-image')}
            </div>
        );
    }

    /**
     * Render choose button if purpose is specified
     *
     * @return {ReactElement|null}
     */
    renderChooseOption() {
        let { env, purpose, readOnly } = this.props;
        let { t } = env.locale;
        if (!purpose) {
            return null;
        }
        let props = { className: 'option' };
        if (!readOnly) {
            props.onClick = this.handleChooseClick;
        }
        return (
            <div {...props}>
                <i className="fa fa-th" />
                {' '}
                {t('image-selector-choose-from-album')}
            </div>
        );
    }

    /**
     * Render upload button
     *
     * @return {ReactElement}
     */
    renderUploadOption() {
        let { env, readOnly } = this.props;
        let { t } = env.locale;
        let inputProps = {
            type: 'file',
            value: '',
            accept: 'image/*',
            disabled: readOnly,
            onChange: this.handleUploadChange,
        };
        return (
            <label className="option">
                <i className="fa fa-upload" />
                {' '}
                {t('image-selector-upload-file')}
                <input {...inputProps} />
            </label>
        );
    }

    renderCroppingDialogBox() {
        let { env, desiredWidth, desiredHeight } = this.props;
        let { cropping } = this.state;
        let image = this.getImage();
        if (!(image && desiredWidth && desiredHeight)) {
            return null;
        }
        let dialogBoxProps = {
            show: cropping,
            image,
            desiredWidth,
            desiredHeight,
            env,
            onSelect: this.handleImageSectionSelect,
            onCancel: this.handleCroppingDialogCancel,
        };
        return <ImageCroppingDialogBox {...dialogBoxProps} />;
    }

    /**
     * Render cropping or album dialog box if one of them is active
     *
     * @return {ReactElement|null}
     */
    renderAlbumDialogBox() {
        let { database, env, payloads, purpose } = this.props;
        let { showingAlbum } = this.state;
        let image = this.getImage();
        let dialogBoxProps = {
            show: showingAlbum,
            purpose,
            image,
            database,
            env,
            payloads,
            onSelect: this.handleImageSelect,
            onCancel: this.handleAlbumDialogCancel,
        };
        return <ImageAlbumDialogBox {...dialogBoxProps} />;
    }

    /**
     * Called when user clicks choose
     *
     * @param  {Event} evt
     */
    handleChooseClick = (evt) => {
        this.setState({ showingAlbum: true });
    }

    /**
     * Called when user clicks crop button
     *
     * @param  {Event} evt
     */
    handleCropClick = (evt) => {
        this.setState({ cropping: true });
    }

    /**
     * Called when user selects an image from album
     *
     * @param  {Object} evt
     */
    handleImageSelect = (evt) => {
        let image = _.clone(evt.image);
        image.type = 'image';
        this.setImage(image);
        this.handleAlbumDialogCancel();
    }

    /**
     * Called when user changes the clipping rect
     *
     * @param  {Object} evt
     */
    handleImageSectionSelect = (evt) => {
        let image = _.clone(this.getImage());
        image.clip = evt.clippingRect;
        this.setImage(image);
        this.handleCroppingDialogCancel();
    }

    /**
     * Called when user selects a file on his computer
     *
     * @param  {Event} evt
     */
    handleUploadChange = (evt) => {
        let { payloads } = this.props;
        let file = evt.target.files[0];
        if (file) {
            let payload = payloads.add('image').attachFile(file);
            return MediaLoader.getImageMetadata(file).then((meta) => {
                let image = {
                    payload_token: payload.id,
                    width: meta.width,
                    height: meta.height,
                    format: meta.format,
                    type: 'image',
                };
                return this.setImage(image);
            });
        }
    }

    /**
     * Called when user clicks cancel or outside a dialog box
     *
     * @param  {Object} evt
     */
    handleAlbumDialogCancel = (evt) => {
        this.setState({ showingAlbum: false });
    }

    /**
     * Called when user clicks cancel or outside a dialog box
     *
     * @param  {Object} evt
     */
    handleCroppingDialogCancel = (evt) => {
        this.setState({ cropping: false });
    }

    /**
     * Called when user clicks on image link
     *
     * @param  {Event} evt
     */
    handleImageClick = (evt) => {
        // open URL in pop-up instead of a tab
        let url = evt.currentTarget.href;
        if (url) {
            let width = parseInt(evt.currentTarget.getAttribute('data-width'));
            let height = parseInt(evt.currentTarget.getAttribute('data-height'));
            let windowWidth = width;
            let windowHeight = height;
            let availableWidth = screen.width - 100;
            let availableHeight = screen.height - 100;
            if (windowWidth > availableWidth) {
                windowWidth = availableWidth;
                windowHeight = Math.round(windowWidth * height / width);
            }
            if (windowHeight > availableHeight) {
                windowHeight = availableHeight;
                windowWidth = Math.round(windowHeight * width / height);
            }
            let windowLeft = Math.round((screen.width - windowHeight) / 3);
            let windowTop = Math.round((screen.height - windowHeight) / 3);
            let params = [
                `left=${windowLeft}`,
                `top=${windowTop}`,
                `width=${windowWidth}`,
                `height=${windowHeight}`,
            ];
            window.open(url, '_blank', params.join(','));
            evt.preventDefault();
        }
    }
}

ImageSelector.defaultProps = {
    resources: [],
    readOnly: false,
};

export {
    ImageSelector as default,
    ImageSelector,
};

import Database from 'data/database';
import Environment from 'env/environment';
import Payloads from 'transport/payloads';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ImageSelector.propTypes = {
        purpose: PropTypes.string,
        desiredWidth: PropTypes.number,
        desiredHeight: PropTypes.number,
        resources: PropTypes.arrayOf(PropTypes.object),
        readOnly: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        onChange: PropTypes.func,
    };
}
