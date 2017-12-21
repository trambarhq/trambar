var React = require('react'), PropTypes = React.PropTypes;
var DeviceManager = require('media/device-manager');

var Locale = require('locale/locale');

// widgets
var HeaderButton = require('widgets/header-button');

require('./media-toolbar.scss');

module.exports = React.createClass({
    displayName: 'MediaToolbar',
    propTypes: {
        story: PropTypes.object.isRequired,
        capturing: PropTypes.oneOf([ 'image', 'video', 'audio' ]),
        locale: PropTypes.instanceOf(Locale).isRequired,
        onAction: PropTypes.func,
    },

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
     * Count the type of resources attached to story
     *
     * @return {Object}
     */
    getResourceCounts: function() {
        var counts = {
            photo: 0,
            video: 0,
            audio: 0,
            file: 0,
        };
        var resources = _.get(this.props.story, 'details.resources');
        _.each(resources, (res) => {
            if (res.imported) {
                counts.file++;
            } else {
                switch (res.type) {
                    case 'image': counts.photo++; break;
                    case 'video': counts.video++; break;
                    case 'audio': counts.audio++; break;
                }
            }
        });
        return counts;
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var counts = this.getResourceCounts();
        var photoButtonProps = {
            label: t('story-photo'),
            icon: 'camera',
            hidden: !counts.photo && !this.state.hasCamera,
            highlighted: (counts.photo > 0 || this.props.capturing === 'image'),
            onClick: this.handlePhotoClick,
        };
        var videoButtonProps = {
            label: t('story-video'),
            icon: 'video-camera',
            hidden: !counts.video && !this.state.hasCamera,
            highlighted: (counts.video > 0 || this.props.capturing === 'video'),
            onClick: this.handleVideoClick,
        };
        var audioButtonProps = {
            label: t('story-audio'),
            icon: 'microphone',
            hidden: !counts.audio && !this.state.hasMicrophone,
            highlighted: (counts.audio > 0 || this.props.capturing === 'audio'),
            onClick: this.handleAudioClick,
        };
        var selectButtonProps = {
            label: t('story-file'),
            icon: 'file',
            multiple: true,
            highlighted: (counts.file > 0),
            onChange: this.handleFileSelect,
        }
        return (
            <div className="media-toolbar">
                <HeaderButton {...photoButtonProps} />
                <HeaderButton {...videoButtonProps} />
                <HeaderButton {...audioButtonProps} />
                <HeaderButton.File {...selectButtonProps} />
            </div>
        );
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
     * Inform parent component that certain action should occur
     *
     * @param  {String} action
     * @param  {Object|undefined} props
     */
    triggerActionEvent: function(action, props) {
        if (this.props.onAction) {
            this.props.onAction(_.extend({
                type: 'action',
                target: this,
                action,
            }, props));
        }
    },

    /**
     * Called when user click on photo button
     *
     * @param  {Event} evt
     */
    handlePhotoClick: function(evt) {
        this.triggerActionEvent('photo-capture');
    },

    /**
     * Called when user click on video button
     *
     * @param  {Event} evt
     */
    handleVideoClick: function(evt) {
        this.triggerActionEvent('video-capture');
    },

    /**
     * Called when user click on audio button
     *
     * @param  {Event} evt
     */
    handleAudioClick: function(evt) {
        this.triggerActionEvent('audio-capture');
    },

    /**
     * Called after user has selected a file
     *
     * @param  {Event} evt
     */
    handleFileSelect: function(evt) {
        var files = evt.target.files;
        if (!_.isEmpty(files)) {
            this.triggerActionEvent('file-import', { files });
        }
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
})
