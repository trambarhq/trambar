var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');

var Database = require('data/database');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

// widgets
var ImageCroppingDialogBox = require('dialogs/image-cropping-dialog-box');
var ImageAlbumDialogBox = require('dialogs/image-album-dialog-box');
var ResourceView = require('widgets/resource-view');

require('./image-selector.scss');

module.exports = React.createClass({
    displayName: 'ImageSelector',
    propTypes: {
        purpose: PropTypes.string,
        desiredWidth: PropTypes.number,
        desiredHeight: PropTypes.number,
        resources: PropTypes.arrayOf(PropTypes.object),
        readOnly: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onChange: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            resources: [],
            readOnly: false,
        };
    },

    getInitialState: function() {
        return {
            showingCroppingDialogBox: false,
            renderingCroppingDialogBox: false,
            showingAlbumDialogBox: false,
            renderingAlbumDialogBox: false,
        };
    },

    /**
     * Return image object if there's one
     *
     * @return {Object|null}
     */
    getImage: function() {
        return _.find(this.props.resources, { type: 'image' });
    },

    /**
     * Update resource array and past it to parent component through an
     * onChange event
     *
     * @param  {Object} image
     */
    setImage: function(image) {
        if (this.props.desiredWidth && this.props.desiredHeight) {
            // center a clipping rect over the image if there's none
            if (!image.clip) {
                var ratio = this.props.desiredWidth / this.props.desiredHeight;
                var width = image.width;
                var height = Math.round(width / ratio);
                var left = 0;
                var top = Math.round((image.height - height) / 2);
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
        var resources = _.slice(this.props.resources);
        var index = _.findIndex(resources, { type: 'image' });
        if (index !== -1) {
            if (image) {
                resources[index] = image;
            } else {
                resources.splice(index, 1);
            }
        } else {
            resources.push(image);
        }
        if (this.props.onChange) {
            this.value = resources;
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var classNames = [ 'image-selector' ];
        if (this.props.readOnly) {
            classNames.push('readonly')
        }
        return (
            <div className={classNames.join(' ')}>
                <label>{this.props.children}</label>
                <div className="contents">
                    {this.renderImage()}
                    {this.renderOptions()}
                </div>
                {this.renderDialogBox()}
            </div>
        );
    },

    /**
     * Render image or placeholder
     *
     * @return {ReactElement}
     */
    renderImage: function() {
        var height = 120, width;
        var image = this.getImage();
        if (image) {
            var fullResURL = this.props.theme.getImageURL(image, { clip: null, remote: true });
            var linkProps = {
                href: fullResURL,
                target: '_blank',
                'data-width': image.width,
                'data-height': image.height,
                onClick: this.handleImageClick,
            };
            var viewProps = {
                resource: image,
                clip: !!(this.props.desiredWidth && this.props.desiredHeight),
                height: height,
                theme: this.props.theme,
            };
            return (
                <div className="image">
                    <a {...linkProps}>
                        <ResourceView {...viewProps} />
                    </a>
                </div>
            );
        } else {
            if (this.props.desiredWidth && this.props.desiredHeight) {
                width = Math.round(this.props.desiredWidth * height / this.props.desiredHeight);
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
    },

    /**
     * Render list of options
     *
     * @return {ReactElement}
     */
    renderOptions: function() {
        return (
            <div className="options">
                {this.renderChooseOption()}
                {this.renderUploadOption()}
                {this.renderResizeOption()}
            </div>
        )
    },

    /**
     * Render crop button if dimensions are specified
     *
     * @return {ReactElement|null}
     */
    renderResizeOption: function() {
        if (!this.props.desiredWidth || !this.props.desiredHeight) {
            return null;
        }
        var t = this.props.locale.translate;
        var props = { className: 'option' };
        if (!this.props.readOnly) {
            props.onClick = this.handleCropClick;
        }
        var image = this.getImage();
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
    },

    /**
     * Render choose button if purpose is specified
     *
     * @return {ReactElement|null}
     */
    renderChooseOption: function() {
        if (!this.props.purpose) {
            return null;
        }
        var t = this.props.locale.translate;
        var props = { className: 'option' };
        if (!this.props.readOnly) {
            props.onClick = this.handleChooseClick;
        }
        return (
            <div {...props}>
                <i className="fa fa-th" />
                {' '}
                {t('image-selector-choose-from-album')}
            </div>
        );
    },

    /**
     * Render upload button
     *
     * @return {ReactElement}
     */
    renderUploadOption: function() {
        var inputProps = {
            type: 'file',
            value: '',
            accept: 'image/*',
            disabled: this.props.readOnly,
            onChange: this.handleUploadChange,
        };
        var t = this.props.locale.translate;
        return (
            <label className="option">
                <i className="fa fa-upload" />
                {' '}
                {t('image-selector-upload-file')}
                <input {...inputProps} />
            </label>
        );
    },

    /**
     * Render cropping or album dialog box if one of them is active
     *
     * @return {ReactElement|null}
     */
    renderDialogBox: function() {
        var image = this.getImage();
        if (this.state.renderingAlbumDialogBox) {
            var dialogBoxProps = {
                show: this.state.showingAlbumDialogBox,
                purpose: this.props.purpose,
                image: image,
                database: this.props.database,
                locale: this.props.locale,
                theme: this.props.theme,
                payloads: this.props.payloads,
                onSelect: this.handleImageSelect,
                onCancel: this.handleDialogCancel,
            };
            return <ImageAlbumDialogBox {...dialogBoxProps} />;
        } else if (this.state.renderingCroppingDialogBox) {
            var dialogBoxProps = {
                show: this.state.showingCroppingDialogBox,
                image: image,
                desiredWidth: this.props.desiredWidth,
                desiredHeight: this.props.desiredHeight,
                locale: this.props.locale,
                theme: this.props.theme,
                onSelect: this.handleImageSectionSelect,
                onCancel: this.handleDialogCancel,
            };
            return <ImageCroppingDialogBox {...dialogBoxProps} />;
        } else {
            return null;
        }
    },

    /**
     * Called when user clicks choose
     *
     * @param  {Event} evt
     */
    handleChooseClick: function(evt) {
        this.setState({
            showingAlbumDialogBox: true,
            renderingAlbumDialogBox: true,
        });
    },

    /**
     * Called when user clicks crop button
     *
     * @param  {Event} evt
     */
    handleCropClick: function(evt) {
        this.setState({
            showingCroppingDialogBox: true,
            renderingCroppingDialogBox: true,
        });
    },

    /**
     * Called when user selects an image from album
     *
     * @param  {Object} evt
     */
    handleImageSelect: function(evt) {
        var image = _.clone(evt.image);
        image.type = 'image';
        this.setImage(image);
        this.handleDialogCancel();
    },

    /**
     * Called when user changes the clipping rect
     *
     * @param  {Object} evt
     */
    handleImageSectionSelect: function(evt) {
        var image = _.clone(this.getImage());
        image.clip = evt.clippingRect;
        this.setImage(image);
        this.handleDialogCancel();
    },

    /**
     * Called when user selects a file on his computer
     *
     * @param  {Event} evt
     */
    handleUploadChange: function(evt) {
        var file = evt.target.files[0];
        if (file) {
            var payload = this.props.payloads.add('image').attachFile(file);
            return MediaLoader.getImageMetadata(file).then((meta) => {
                var image = {
                    payload_token: payload.token,
                    width: meta.width,
                    height: meta.height,
                    format: meta.format,
                    type: 'image',
                };
                return this.setImage(image);
            });
        }
    },

    /**
     * Called when user clicks cancel or outside a dialog box
     *
     * @param  {Object} evt
     */
    handleDialogCancel: function(evt) {
        if (this.state.showingAlbumDialogBox) {
            this.setState({ showingAlbumDialogBox: false });
            setTimeout(() => {
                if (!this.state.showingAlbumDialogBox) {
                    this.setState({ renderingAlbumDialogBox: false });
                }
            }, 500);
        }
        if (this.state.showingCroppingDialogBox) {
            this.setState({ showingCroppingDialogBox: false });
            setTimeout(() => {
                if (!this.state.showingCroppingDialogBox) {
                    this.setState({ renderingCroppingDialogBox: false });
                }
            }, 500);
        }
    },

    /**
     * Called when user clicks on image link
     *
     * @param  {Event} evt
     */
    handleImageClick: function(evt) {
        // open URL in pop-up instead of a tab
        var url = evt.currentTarget.href;
        if (url) {
            var width = parseInt(evt.currentTarget.getAttribute('data-width'));
            var height = parseInt(evt.currentTarget.getAttribute('data-height'));
            var windowWidth = width;
            var windowHeight = height;
            var availableWidth = screen.width - 100;
            var availableHeight = screen.height - 100;
            if (windowWidth > availableWidth) {
                windowWidth = availableWidth;
                windowHeight = Math.round(windowWidth * height / width);
            }
            if (windowHeight > availableHeight) {
                windowHeight = availableHeight;
                windowWidth = Math.round(windowHeight * width / height);
            }
            var windowLeft = Math.round((screen.width - windowHeight) / 3);
            var windowTop = Math.round((screen.height - windowHeight) / 3);
            var params = [
                `left=${windowLeft}`,
                `top=${windowTop}`,
                `width=${windowWidth}`,
                `height=${windowHeight}`,
            ];
            window.open(url, '_blank', params.join(','));
            evt.preventDefault();
        }
    },
});
