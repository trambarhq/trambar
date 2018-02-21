var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var ComponentRefs = require('utils/component-refs');

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
        return {};
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
        var resources = this.getUserProperty('details.resources');
        var image = _.find(resources, { type: 'image' });
        var contents;
        if (image) {
            var props = {
                resource: image,
                locale: this.props.locale,
                theme: this.props.theme,
                previewWidth: 256,
                previewHeight: 256,
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
        var resources = _.get(this.props.currentUser, 'details.resources', []);
        var props = {
            ref: setters.importer,
            types: [ 'image' ],
            limit: 1,
            schema: 'global',
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads.override({ schema: 'global' }),
            onChange: this.handleChange,
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
        var resources = this.getUserProperty('details.resources');
        var hasPicture = _.some(resources, { type: 'image' });
        var removeProps = {
            label: t('user-image-remove'),
            hidden: !hasPicture,
            onClick: this.handleRemoveClick,
        };
        var takeProps = {
            label: t('user-image-snap'),
            onClick: this.handleTakeClick,
        };
        var selectProps = {
            label: t('user-image-select'),
            highlighted: !hasPicture,
            accept: 'image/*',
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
     * Called when cropping rectangle changes
     *
     * @param  {Object} evt
     */
    handleImageChange: function(evt) {
        var resources = this.getUserProperty('details.resources');
        var resourcesAfter = _.slice(resources);
        var index = _.findIndex(resourcesAfter, { type: 'image' });
        if (index !== -1) {
            resourcesAfter[index] = evt.resource;
        } else {
            resourcesAfter.push(evt.resource);
        }
        this.setUserProperty('details.resources', resourcesAfter);
    },

    /**
     * Called when MediaImporter has imported an image
     *
     * @param  {Object} evt
     *
     * @return {Promise}
     */
    handleChange: function(evt) {
        this.setUserProperty('details.resources', evt.resources);
        return Promise.resolve();
    },
});
