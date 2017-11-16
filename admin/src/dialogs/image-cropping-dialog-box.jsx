var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var ImageCropper = require('media/image-cropper');

require('./image-cropping-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'ImageCroppingDialogBox',
    propTypes: {
        image: PropTypes.object,
        desiredWidth: PropTypes.number,
        desiredHeight: PropTypes.number,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelect: PropTypes.func,
        onCancel: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var image = this.props.image;
        return {
            clippingRect: image.clip,
            hasChanged: false,
        };
    },

    zoom: function(amount) {
        var clippingRect = this.resizeClippingRect(amount);
        this.setState({ clippingRect })
    },

    canZoom: function(amount) {
        var clippingRect = this.resizeClippingRect(amount);
        return !_.isEqual(clippingRect, this.state.clippingRect);
    },

    /**
     * Return a rectangle that's larger ro smaller than the current one
     *
     * @param  {Number} amount
     *
     * @return {Object}
     */
    resizeClippingRect: function(amount) {
        var rect = this.state.clippingRect;
        var width = Math.round(rect.width * amount);
        var height = Math.round(rect.height * amount);
        var imgWidth = this.props.image.width;
        var imgHeight = this.props.image.height;
        var ratio = this.props.desiredWidth / this.props.desiredHeight;
        if (width > imgWidth) {
            width = imgWidth;
            height = Math.round(width / ratio);
        }
        if (height > imgHeight) {
            height = imgHeight;
            width = Math.round(height * ratio);
        }
        var left = rect.left - Math.round((width - rect.width) / 2);
        var top = rect.top - Math.round((height - rect.height) / 2);
        if (left < 0) {
            left = 0;
        }
        if (top < 0) {
            top = 0;
        }
        return { left, top, width, height };
    },


    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <Overlay show={this.props.show}>
                <div className="image-cropping-dialog-box">
                    {this.renderImage()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    /**
     * Render image cropper
     *
     * @return {ReactElement}
     */
    renderImage: function() {
        var image = this.props.image;
        var props = {
            url: this.props.theme.getImageUrl(image, { clip: null }),
            clippingRect: this.state.clippingRect,
            aspectRatio: this.props.desiredWidth / this.props.desiredHeight,
            onChange: this.handleChange,
        };
        var style = {
            width: this.props.desiredWidth,
            height: this.props.desiredHeight,
        };
        return (
            <div className="image" style={style}>
                <ImageCropper {...props} />
            </div>
        );

    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var zoomOutProps = {
            className: 'zoom',
            disabled: !this.canZoom(1 / 0.9),
            onClick: this.handleZoomOutClick,
        };
        var zoomInProps = {
            className: 'zoom',
            disabled: !this.canZoom(0.9),
            onClick: this.handleZoomInClick,
        };
        var cancelProps = {
            className: 'cancel',
            onClick: this.handleCancelClick,
        };
        var selectProps = {
            className: 'select',
            disabled: !this.state.hasChanged,
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
    },

    /**
     * Called when user moves the image or change the zoom
     *
     * @param  {Object} evt
     */
    handleChange: function(evt) {
        var image = this.props.image;
        var clippingRect = _.mapValues(evt.rect, (value) => {
            return Math.round(value);
        });

        var hasChanged = true;
        if (_.isEqual(clippingRect, image.rect)) {
            hasChanged = false;
        }
        this.setState({ clippingRect, hasChanged });
    },

    /**
     * Called when user clicks on cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
    },

    /**
     * Called when user clicks on OK button
     *
     * @param  {Event} evt
     */
    handleSelectClick: function(evt) {
        if (this.props.onSelect) {
            this.props.onSelect({
                type: 'select',
                target: this,
                clippingRect: this.state.clippingRect,
            });
        }
    },

    /**
     * Called when user clicks zoom in button
     *
     * @param  {Event} evt
     */
    handleZoomInClick: function(evt) {
        this.zoom(0.9);
    },

    /**
     * Called when user clicks zoom out button
     *
     * @param  {Event} evt
     */
    handleZoomOutClick: function(evt) {
        this.zoom(1 / 0.9);
    },
});
