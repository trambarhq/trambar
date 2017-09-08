var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

// widgets
var ImageCroppingDialogBox = require('dialogs/image-cropping-dialog-box');
var ImageAlbumDialogBox = require('dialogs/image-album-dialog-box');

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
        var image = this.getImage();
        if (image) {
            var imageUrl = this.props.theme.getImageUrl(image, { height: 80 });
            var fullImageUrl = this.props.theme.getImageUrl(image);
            return (
                <div className="image">
                    <a href={fullImageUrl} target="_blank">
                        <img src={imageUrl} />
                    </a>
                </div>
            );
        } else {
            var style = {
                width: 160,
                height: 120,
            };
            return (
                <div className="image">
                    <div className="placeholder" style={style}>
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
                {this.renderResizeOption()}
                {this.renderChooseOption()}
                {this.renderUploadOption()}
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
        var className = 'option';
        var image = this.getImage();
        if (!image) {
            className += ' disabled';
        }
        return (
            <div className={className} onClick={this.handleCropClick}>
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
        return (
            <div className="option" onClick={this.handleChooseClick}>
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
        if (this.state.renderingAlbumDialogBox) {
            var image = this.getImage();
            var dialogBoxProps = {
                show: this.state.showingAlbumDialogBox,
                purpose: this.props.purpose,
                image: image,
                database: this.props.database,
                locale: this.props.locale,
                theme: this.props.theme,
                onSelect: this.handleImageSelect,
                onCancel: this.handleDialogCancel,
            };
            return <ImageAlbumDialogBox {...dialogBoxProps} />;
        } else if (this.state.renderingCroppingDialogBox) {
            var dialogBoxProps = {
                show: this.state.showingCroppingDialogBox,
            };
            return <ImageCroppingDialogBox {...dialogBoxProps} />;
        } else {
            return null;
        }
    },

    /**
     * Called when user clicks crop button
     *
     * @param  {Event} evt
     */
    handleChooseClick: function(evt) {
        this.setState({
            showingCroppingDialogBox: true,
            renderingCroppingDialogBox: true,
        });
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
     * Called when user selects an image from album
     *
     * @param  {Object} evt
     */
    handleImageSelect: function(evt) {
        var imageBefore = this.getImage();
        var imageAfter = _.clone(evt.image);
        // TODO: apply clip rect
        imageAfter.type = 'image';
        var resources = _.slice(this.props.resources);
        if (imageBefore) {
            var index = _.indexOf(resources, imageBefore);
            resources[index] = imageAfter;
        } else {
            resources.push(imageAfter);
        }
        if (this.props.onChange) {
            this.value = resources;
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
        this.handleDialogCancel();
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
});
