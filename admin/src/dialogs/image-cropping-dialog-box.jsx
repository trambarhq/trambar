import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import ImageCropper from 'widgets/image-cropper';

import './image-cropping-dialog-box.scss';

class ImageCroppingDialogBox extends PureComponent {
    static displayName = 'ImageCroppingDialogBox';

    constructor(props) {
        super(props);
        let { image } = props;
        this.state = {
            clippingRect: image.clip,
            hasChanged: false,
        };
    }

    /**
     * Change zoom level image by fractional amount
     *
     * @param  {Number} amount
     */
    zoom(amount) {
        let clippingRect = this.resizeClippingRect(amount);
        this.setState({ clippingRect })
    }

    /**
     * Return true if it's possible to zoom out
     *
     * @param  {Number} amount
     *
     * @return {Boolean}
     */
    canZoom(amount) {
        let { clippingRect } = this.state;
        let rect = this.resizeClippingRect(amount);
        return !_.isEqual(rect, clippingRect);
    }

    /**
     * Return a rectangle that's larger ro smaller than the current one
     *
     * @param  {Number} amount
     *
     * @return {Object}
     */
    resizeClippingRect(amount) {
        let { image, desiredWidth, desiredHeight } = this.props;
        let { clippingRect } = this.state;
        let width = Math.round(clippingRect.width * amount);
        let height = Math.round(clippingRect.height * amount);
        let ratio = desiredWidth / desiredHeight;
        if (width > image.width) {
            width = image.width;
            height = Math.round(width / ratio);
        }
        if (height > image.height) {
            height = image.height;
            width = Math.round(height * ratio);
        }
        let left = clippingRect.left - Math.round((width - clippingRect.width) / 2);
        let top = clippingRect.top - Math.round((height - clippingRect.height) / 2);
        if (left < 0) {
            left = 0;
        }
        if (top < 0) {
            top = 0;
        }
        return { left, top, width, height };
    }


    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show } = this.props;
        return (
            <Overlay show={show}>
                <div className="image-cropping-dialog-box">
                    {this.renderImage()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render image cropper
     *
     * @return {ReactElement}
     */
    renderImage() {
        let { env, image, desiredWidth, desiredHeight } = this.props;
        let { clippingRect } = this.state;
        let url = env.getImageURL(image, { clip: null });
        if (isJSONEncoded(imageURL)) {
            // a blob that hasn't been uploaded yet
            let info = parseJSONEncodedURL(imageURL)
            url = info.url;
        }
        let props = {
            url,
            clippingRect,
            vector: image.format === 'svg',
            onChange: this.handleChange,
        };
        let style = {
            width: desiredWidth,
            height: desiredHeight,
        };
        return (
            <div className="image" style={style}>
                <ImageCropper {...props} />
            </div>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env } = this.props;
        let { hasChanged } = this.state;
        let { t } = env.locale;
        let zoomOutProps = {
            className: 'zoom',
            disabled: !this.canZoom(1 / 0.9),
            onClick: this.handleZoomOutClick,
        };
        let zoomInProps = {
            className: 'zoom',
            disabled: !this.canZoom(0.9),
            onClick: this.handleZoomInClick,
        };
        let cancelProps = {
            className: 'cancel',
            onClick: this.handleCancelClick,
        };
        let selectProps = {
            className: 'select',
            disabled: !hasChanged,
            onClick: this.handleSelectClick,
        };
        return (
            <div key="select" className="buttons">
                <div className="left">
                    <PushButton {...zoomOutProps}><i className="fa fa-search-minus" /></PushButton>
                    <PushButton {...zoomInProps}><i className="fa fa-search-plus" /></PushButton>
                </div>
                <div className="right">
                    <PushButton {...cancelProps}>{t('image-cropping-cancel')}</PushButton>
                    {' '}
                    <PushButton {...selectProps}>{t('image-cropping-select')}</PushButton>
                </div>
            </div>
        );
    }

    /**
     * Called when user moves the image or change the zoom
     *
     * @param  {Object} evt
     */
    handleChange = (evt) =>
        let { image } = this.props;
        let clippingRect = _.mapValues(evt.rect, (value) => {
            return Math.round(value);
        });
        let hasChanged = true;
        if (_.isEqual(clippingRect, image.rect)) {
            hasChanged = false;
        }
        this.setState({ clippingRect, hasChanged });
    }

    /**
     * Called when user clicks on cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) =>
        let { onCancel } = this.props;
        if (onCancel) {
            onCancel({
                type: 'cancel',
                target: this,
            });
        }
    }

    /**
     * Called when user clicks on OK button
     *
     * @param  {Event} evt
     */
    handleSelectClick = (evt) =>
        let { onSelect } = this.props;
        let { clippingRect } = this.state;
        if (onSelect) {
            onSelect({
                type: 'select',
                target: this,
                clippingRect,
            });
        }
    }

    /**
     * Called when user clicks zoom in button
     *
     * @param  {Event} evt
     */
    handleZoomInClick = (evt) =>
        this.zoom(0.9);
    }

    /**
     * Called when user clicks zoom out button
     *
     * @param  {Event} evt
     */
    handleZoomOutClick = (evt) =>
        this.zoom(1 / 0.9);
    }
}

function isJSONEncoded(url) {
    return _.startsWith(url, 'json:');
}

function parseJSONEncodedURL(url) {
    let json = url.substr(5);
    return JSON.parse(json);
}

export {
    ImageCroppingDialogBox as default,
    ImageCroppingDialogBox,
};

import Database from 'data/database';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ImageCroppingDialogBox.propTypes = {
        image: PropTypes.object,
        desiredWidth: PropTypes.number,
        desiredHeight: PropTypes.number,
        env: PropTypes.instanceOf(Environment).isRequired,
        onSelect: PropTypes.func,
        onCancel: PropTypes.func,
    };
}
