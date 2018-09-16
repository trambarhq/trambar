import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as MediaLoader from 'media/media-loader';

// widgets
import ImageCroppingDialogBox from 'dialogs/image-cropping-dialog-box';
import ImageAlbumDialogBox from 'dialogs/image-album-dialog-box';
import ResourceView from 'widgets/resource-view';

import './image-selector.scss';

class ImageSelector extends PureComponent {
    static displayName = 'ImageSelector';

    constructor(props) {
        super(props);
        this.state = {
            showingCroppingDialogBox: false,
            renderingCroppingDialogBox: false,
            showingAlbumDialogBox: false,
            renderingAlbumDialogBox: false,
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
                {this.renderDialogBox()}
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
            let fullResURL = env.getImageURL(image, { clip: null, remote: true });
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

    /**
     * Render cropping or album dialog box if one of them is active
     *
     * @return {ReactElement|null}
     */
    renderDialogBox() {
        let { database, env, payloads, purpose, desiredWidth, desiredHeight } = this.props;
        let {
            showingAlbumDialogBox,
            showingCroppingDialogBox,
            renderingAlbumDialogBox,
            renderingCroppingDialogBox,
        } = this.state;
        let image = this.getImage();
        if (renderingAlbumDialogBox) {
            let dialogBoxProps = {
                show: showingAlbumDialogBox,
                purpose,
                image,
                database,
                env,
                payloads,
                onSelect: this.handleImageSelect,
                onCancel: this.handleDialogCancel,
            };
            return <ImageAlbumDialogBox {...dialogBoxProps} />;
        } else if (renderingCroppingDialogBox) {
            let dialogBoxProps = {
                show: showingCroppingDialogBox,
                image,
                desiredWidth,
                desiredHeight,
                env,
                onSelect: this.handleImageSectionSelect,
                onCancel: this.handleDialogCancel,
            };
            return <ImageCroppingDialogBox {...dialogBoxProps} />;
        } else {
            return null;
        }
    }

    /**
     * Called when user clicks choose
     *
     * @param  {Event} evt
     */
    handleChooseClick = (evt) => {
        this.setState({
            showingAlbumDialogBox: true,
            renderingAlbumDialogBox: true,
        });
    }

    /**
     * Called when user clicks crop button
     *
     * @param  {Event} evt
     */
    handleCropClick = (evt) => {
        this.setState({
            showingCroppingDialogBox: true,
            renderingCroppingDialogBox: true,
        });
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
        this.handleDialogCancel();
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
        this.handleDialogCancel();
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
    handleDialogCancel = (evt) => {
        let { showingAlbumDialogBox, showingCroppingDialogBox } = this.state;
        if (showingAlbumDialogBox) {
            this.setState({ showingAlbumDialogBox: false });
            setTimeout(() => {
                if (!showingAlbumDialogBox) {
                    this.setState({ renderingAlbumDialogBox: false });
                }
            }, 500);
        }
        if (showingCroppingDialogBox) {
            this.setState({ showingCroppingDialogBox: false });
            setTimeout(() => {
                if (!showingCroppingDialogBox) {
                    this.setState({ renderingCroppingDialogBox: false });
                }
            }, 500);
        }
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
