var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var DeviceManager = require('media/device-manager');
var ComponentRefs = require('utils/component-refs');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var HeaderButton = require('widgets/header-button');
var DropZone = require('widgets/drop-zone');
var ResourcesEditor = require('editors/resources-editor');

require('./story-media-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryMediaEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onChange: PropTypes.func.isRequired,
    },
    components: ComponentRefs({
        resEditor: ResourcesEditor
    }),

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            hasCamera: DeviceManager.hasDevice('videoinput'),
            hasMicrophone: DeviceManager.hasDevice('audioinput'),
        };
    },

    /**
     * Add event listeners on mount
     */
    componentWillMount: function() {
        document.addEventListener('paste', this.handlePaste);
        DeviceManager.addEventListener('change', this.handleDeviceChange);
    },

    /**
     * Render component
     *
     * @return {ReactELement}
     */
    render: function() {
        return (
            <StorySection className="media-editor">
                <header>
                    {this.renderButtons()}
                </header>
                <body>
                    <DropZone onDrop={this.handleDrop}>
                        {this.renderResources()}
                    </DropZone>
                </body>
            </StorySection>
        );
    },

    /**
     * Render buttons for ataching media
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var photoButtonProps = {
            label: t('story-photo'),
            icon: 'camera',
            hidden: !this.state.hasCamera,
            onClick: this.handlePhotoClick,
        };
        var videoButtonProps = {
            label: t('story-video'),
            icon: 'video-camera',
            hidden: !this.state.hasCamera,
            onClick: this.handleVideoClick,
        };
        var audioButtonProps = {
            label: t('story-audio'),
            icon: 'microphone',
            hidden: !this.state.hasMicrophone,
            onClick: this.handleAudioClick,
        };
        var selectButtonProps = {
            label: t('story-file'),
            icon: 'file',
            multiple: true,
            onChange: this.handleFileSelect,
        }
        return (
            <div>
                <HeaderButton {...photoButtonProps} />
                <HeaderButton {...videoButtonProps} />
                <HeaderButton {...audioButtonProps} />
                <HeaderButton.File {...selectButtonProps} />
                {this.props.cornerPopUp}
            </div>
        );
    },

    /**
     * Render resources editor
     *
     * @return {ReactElement}
     */
    renderResources: function() {
        var t = this.props.locale.translate;
        var editorProps = {
            ref: this.components.setters.resEditor,
            resources: _.get(this.props.story, 'details.resources'),
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleResourcesChange,
        };
        return (
            <ResourcesEditor {...editorProps}>
                <div className="message">
                    {t('story-drop-files-here')}
                </div>
            </ResourcesEditor>
        );
    },

    componentWillUnmount: function() {
        document.removeEventListener('paste', this.handlePaste);
        DeviceManager.removeEventListener('change', this.handleDeviceChange);
    },

    /**
     * Called when user click on photo button
     *
     * @param  {Event} evt
     */
    handlePhotoClick: function(evt) {
        this.components.resEditor.capture('image');
    },

    /**
     * Called when user click on video button
     *
     * @param  {Event} evt
     */
    handleVideoClick: function(evt) {
        this.components.resEditor.capture('video');
    },

    /**
     * Called when user click on audio button
     *
     * @param  {Event} evt
     */
    handleAudioClick: function(evt) {
        this.components.resEditor.capture('audio');
    },

    /**
     * Called after user has selected a file
     *
     * @param  {Event} evt
     */
    handleFileSelect: function(evt) {
        var files = evt.target.files;
        this.components.resEditor.importFiles(files);
        return null;
    },

    /**
     * Called when user drops an item over the editor
     *
     * @param  {Object} evt
     */
    handleDrop: function(evt) {
        this.components.resEditor.importFiles(evt.files);
        this.components.resEditor.importDataItems(evt.items);
        return null;
    },

    /**
     * Called when user hit ctrl-v
     *
     * @param  {ClipboardEvent} evt
     */
    handlePaste: function(evt) {
        var files = evt.clipboardData.files;
        if (!_.isEmpty(files)) {
            evt.preventDefault();
            this.components.resEditor.importFiles(files);
        }
        return null;
    },

    /**
     * Called when user add new resources or adjusted image cropping
     *
     * @param  {Object} evt
     *
     * @return {Promise}
     */
    handleResourcesChange: function(evt) {
        var path = 'details.resources';
        var story = _.decoupleSet(this.props.story, path, evt.resources);
        if (_.isEmpty(story.details.resources)) {
            delete story.details.resources;
        }
        return this.props.onChange({
            type: 'change',
            target: this,
            story,
            path,
        });
    },

    /**
     * Called when the list of media devices changes
     *
     * @param  {Object} evt
     */
    handleDeviceChange: function(evt) {
        this.setState({
            hasCamera: DeviceManager.hasDevice('videoinput'),
            hasMicrophone: DeviceManager.hasDevice('audioinput'),
        });
    },
});
