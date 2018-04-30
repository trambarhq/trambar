var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var ComponentRefs = require('utils/component-refs');
var FocusManager = require('utils/focus-manager');
var DeviceManager = require('media/device-manager');

var Payloads = require('transport/payloads');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsPanel = require('widgets/settings-panel');
var PushButton = require('widgets/push-button');
var ImageEditor = require('editors/image-editor');
var MediaImporter = require('editors/media-importer');

require('./user-image-panel.scss');

module.exports = React.createClass({
    displayName: 'UserImagePanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.object,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
        this.components = ComponentRefs({
            importer: MediaImporter
        })
        return {
            action: null,
            image: null,
            hasCamera: DeviceManager.hasDevice('videoinput'),
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
     * Return either the pending image or existing
     *
     * @return {[type]}
     */
    getImage: function() {
        if (this.state.image) {
            return this.state.image;
        } else {
            var resources = this.getUserProperty('details.resources');
            return _.find(resources, { type: 'image' });
        }
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
                user: userAfter,
                immediate: true
            });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <SettingsPanel className="user-image">
                <header>
                    <i className="fa fa-image" /> {t('settings-profile-image')}
                </header>
                <body>
                    {this.renderProfilePicture()}
                    {this.renderMediaImporter()}
                </body>
                <footer>
                    {this.renderButtons()}
                </footer>
            </SettingsPanel>
        );
    },

    /**
     * Render either an image cropper or a placeholder
     *
     * @return {ReactElement}
     */
    renderProfilePicture: function() {
        var contents;
        var image = this.getImage();
        if (image) {
            var props = {
                resource: image,
                locale: this.props.locale,
                theme: this.props.theme,
                previewWidth: 256,
                previewHeight: 256,
                disabled: (this.state.action !== 'adjust'),
                onChange: this.handleImageChange,
            };
            contents = <ImageEditor {...props} />;
        } else {
            var Icon = require('octicons/build/svg/person.svg');
            contents = (
                <div className="no-image">
                    <Icon className="" />
                </div>
            );
        }
        return <div className="image-container">{contents}</div>;
    },

    /**
     * Render media importer
     *
     * @return {ReactElement}
     */
    renderMediaImporter: function() {
        var setters = this.components.setters;
        var resources;
        if (this.state.image) {
            resources = [ this.state.image ];
        } else {
            resources = _.get(this.props.currentUser, 'details.resources', []);
        }
        var props = {
            ref: setters.importer,
            types: [ 'image' ],
            limit: 1,
            schema: 'global',
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads.override({ schema: 'global' }),
            cameraDirection: 'front',
            onChange: this.handleChange,
            onCaptureEnd: this.handleCaptureEnd,
        };
        return <MediaImporter {...props} />
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var hasPicture = !!this.getImage();
        if (this.state.action === 'adjust' && hasPicture) {
            var cancelProps = {
                label: t('user-image-cancel'),
                onClick: this.handleCancelClick,
            };
            var saveProps = {
                label: t('user-image-save'),
                emphasized: true,
                disabled: !this.state.image,
                onClick: this.handleSaveClick,
            }
            return (
                <div key="adjust" className="buttons">
                    <PushButton {...cancelProps} />
                    <PushButton {...saveProps} />
                </div>
            );
        } else if (this.state.action === 'replace' && hasPicture) {
            var cancelProps = {
                label: t('user-image-cancel'),
                onClick: this.handleCancelClick,
            };
            var takeProps = {
                label: t('user-image-snap'),
                hidden: !this.state.hasCamera,
                onClick: this.handleTakeClick,
            };
            var selectProps = {
                label: t('user-image-select'),
                accept: 'image/*',
                onChange: this.handleFileChange,
            };
            return (
                <div key="replace" className="buttons">
                    <PushButton {...cancelProps} />
                    <PushButton {...takeProps} />
                    <PushButton.File {...selectProps} />
                </div>
            );
        } else if (hasPicture) {
            var adjustProps = {
                label: t('user-image-adjust'),
                onClick: this.handleAdjustClick,
            };
            var replaceProps = {
                label: t('user-image-replace'),
                onClick: this.handleReplaceClick,
            };
            return (
                <div key="action" className="buttons">
                    <PushButton {...adjustProps} />
                    <PushButton {...replaceProps} />
                </div>
            );
        } else {
            var takeProps = {
                label: t('user-image-snap'),
                hidden: !this.state.hasCamera,
                onClick: this.handleTakeClick,
            };
            var selectProps = {
                label: t('user-image-select'),
                accept: 'image/*',
                onChange: this.handleFileChange,
            };
            return (
                <div key="add" className="buttons">
                    <PushButton {...takeProps} />
                    <PushButton.File {...selectProps} />
                </div>
            );
        }
    },

    /**
     * Add event listener on mount
     */
    componentDidMount: function() {
        DeviceManager.addEventListener('change', this.handleDeviceChange);
    },

    /**
     * Remove handlers on unmount
     */
    componentWillUnmount: function() {
        DeviceManager.removeEventListener('change', this.handleDeviceChange);
    },

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        this.setState({ action: null, image: null })
    },

    /**
     * Called when user clicks adjust button
     *
     * @param  {Event} evt
     */
    handleAdjustClick: function(evt) {
        this.setState({ action: 'adjust' });
    },

    /**
     * Called when user clicks adjust button
     *
     * @param  {Event} evt
     */
    handleReplaceClick: function(evt) {
        this.setState({ action: 'replace' });
    },

    /**
     * Called when user clicks take picture button
     *
     * @param  {Event} evt
     */
    handleTakeClick: function(evt) {
        this.components.importer.capture('image');
    },

    /**
     * Called when a file is selected
     *
     * @param  {Event} evt
     */
    handleFileChange: function(evt) {
        var files = evt.target.files;
        this.components.importer.importFiles(files);
    },

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick: function(evt) {
        if (this.state.image) {
            this.setUserProperty('details.resources', [ this.state.image ]);
            this.setState({ action: null, image: null });
        }
    },

    /**
     * Called when cropping rectangle changes
     *
     * @param  {Object} evt
     */
    handleImageChange: function(evt) {
        this.setState({ image: evt.resource });
    },

    /**
     * Called when MediaImporter has imported or captured an image
     *
     * @param  {Object} evt
     *
     * @return {Promise}
     */
    handleChange: function(evt) {
        this.setState({ image: evt.resources[0], action: 'adjust' });
        return Promise.resolve();
    },

    /**
     * Called when image capturing has ended
     *
     * @param  {Object} evt
     */
    handleCaptureEnd: function(evt) {
    },

    /**
     * Called when the list of media devices changes
     *
     * @param  {Object} evt
     */
    handleDeviceChange: function(evt) {
        this.setState({
            hasCamera: DeviceManager.hasDevice('videoinput'),
        });
    },
});
