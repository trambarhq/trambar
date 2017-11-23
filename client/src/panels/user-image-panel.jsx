var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var MediaLoader = require('media/media-loader');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsSection = require('widgets/settings-section');
var PushButton = require('widgets/push-button');
var ImageEditor = require('editors/image-editor');
var PhotoCaptureDialogBox = require('dialogs/photo-capture-dialog-box');

require('./user-image-panel.scss');

module.exports = React.createClass({
    displayName: 'UserImagePanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            capturing: false
        };
    },

    /**
     * Return a property of the user object
     *
     * @param  {String} path
     *
     * @return {*}
     */
    getUserProperty: function(path) {
        return _.get(this.props.currentUser, path);
    },

    /**
     * Change a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty: function(path, value) {
        if (!this.props.currentUser) {
            return;
        }
        var userAfter = _.decoupleSet(this.props.currentUser, path, value);
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                user: userAfter
            });
        }
    },

    /**
     * Replace or add image to user object
     *
     * @param  {Object} resource
     */
    setImage: function(resource) {
        var resources = this.getUserProperty('details.resources');
        var resourcesAfter = _.slice(resources);
        var index = _.findIndex(resourcesAfter, { type: 'image' });
        if (index !== -1) {
            resourcesAfter[index] = resource;
        } else {
            resourcesAfter.push(resource);
        }
        this.setUserProperty('details.resources', resourcesAfter);
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <SettingsSection className="user-image">
                <header>
                    <i className="fa fa-image" /> {t('settings-profile-image')}
                </header>
                <body>
                    {this.renderProfilePicture()}
                    {this.renderDialogBox()}
                </body>
                <footer>
                    {this.renderButtons()}
                </footer>
            </SettingsSection>
        );
    },

    /**
     * Render either an image cropper or a placeholder
     *
     * @return {ReactElement}
     */
    renderProfilePicture: function() {
        var resources = this.getUserProperty('details.resources');
        var image = _.find(resources, { type: 'image' });
        if (image) {
            var props = {
                resource: image,
                locale: this.props.locale,
                theme: this.props.theme,
                previewWidth: 256,
                previewHeight: 256,
                onChange: this.handleImageChange,
            };
            return <ImageEditor {...props} />;
        } else {
            var Icon = require('octicons/build/svg/person.svg');
            return (
                <div className="no-image">
                    <Icon className="" />
                </div>
            );
        }
    },

    /**
     * Render dialogbox for capturing picture through MediaStream API
     *
     * @return {ReactElement}
     */
    renderDialogBox: function() {
        var props = {
            show: this.state.capturing,
            locale: this.props.locale,
            onCapture: this.handlePhotoCapture,
            onCancel: this.handleCaptureCancel,
        };
        return <PhotoCaptureDialogBox {...props} />
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var removeProps = {
            label: 'Remove',
            onClick: this.handleRemoveClick,
        };
        var takeProps = {
            label: 'Take picture',
            onClick: this.handleTakeClick,
        };
        var selectProps = {
            label: 'Select picture',
            onChange: this.handleFileChange,
        };
        return (
            <div className="buttons">
                <div className="left">
                    <PushButton {...removeProps} />
                </div>
                <div className="right">
                    <PushButton {...takeProps} />
                    <PushButton.File {...selectProps} />
                </div>
            </div>
        );
    },

    /**
     * Called when user clicks remove button
     *
     * @param  {Event} evt
     */
    handleRemoveClick: function(evt) {
        var resources = this.getUserProperty('details.resources');
        var index = _.findIndex(resources, { type: 'image' });
        var resourcesAfter = _.slice(resources);
        resourcesAfter.splice(index, 1);
        this.setUserProperty('details.resources', resourcesAfter);
    },

    /**
     * Called when user clicks take picture button
     *
     * @param  {Event} evt
     */
    handleTakeClick: function(evt) {
        this.setState({ capturing: true });
    },

    /**
     * Called when user has taken a photo
     *
     * @param  {Object} evt
     */
    handlePhotoCapture: function(evt) {
        var image = evt.image;
        var resource = _.assign({
            type: 'image',
            clip: getDefaultClippingRect(image.width, image.height),
            filename: getFilenameFromTime('.jpg'),
        }, image);
        this.setImage(resource);
        this.setState({ capturing: false });
    },

    /**
     * Called when user cancel photo taking
     *
     * @param  {Object} evt
     */
    handleCaptureCancel: function(evt) {
        this.setState({ capturing: false });
    },

    /**
     * Called when cropping rectangle changes
     *
     * @param  {Object} evt
     */
    handleImageChange: function(evt) {
        this.setImage(evt.resource);
    },

    /**
     * Called when user selects a file
     *
     * @param  {Event} evt
     */
    handleFileChange: function(evt) {
        var file = evt.target.files[0];
        if (file) {
            var format = _.last(_.split(file.type, '/'));
            var url = URL.createObjectURL(file);
            return MediaLoader.loadImage(url).then((image) => {
                var resource = {
                    type: 'image',
                    format: format,
                    filename: file.name,
                    file: file,
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                    clip: getDefaultClippingRect(image.naturalWidth, image.naturalHeight),
                };
                this.setImage(resource);
                return null;
            }).finally(() => {
                URL.revokeObjectURL(url);
            });
        }
    }
});

/**
 * Return a square clipping rect
 *
 * @param  {Number} width
 * @param  {Number} height
 * @param  {String} align
 *
 * @return {Object}
 */
function getDefaultClippingRect(width, height, align) {
    var left = 0, top = 0;
    var length = Math.min(width, height);
    if (align === 'center' || !align) {
        if (width > length) {
            left = Math.floor((width - length) / 2);
        } else if (height > length) {
            top = Math.floor((height - length) / 2);
        }
    }
    return { left, top, width: length, height: length };
}

/**
 * Generate a filename from the current time
 *
 * @return {String}
 */
function getFilenameFromTime(ext) {
    return _.toUpper(Moment().format('YYYY-MMM-DD-hhA')) + ext;
}
