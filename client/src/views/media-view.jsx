var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var HTTPRequest = require('transport/http-request');
var Memoize = require('utils/memoize');
var ComponentRefs = require('utils/component-refs');
var Payload = require('transport/payload');
var ImageCropping = require('media/image-cropping');

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var MediaButton = require('widgets/media-button');
var MediaDialogBox = require('dialogs/media-dialog-box');
var ResourceView = require('widgets/resource-view');
var DurationIndicator = require('widgets/duration-indicator');

// mixins
var UpdateCheck = require('mixins/update-check');

require('./media-view.scss');

module.exports = React.createClass({
    displayName: 'MediaView',
    mixins: [ UpdateCheck ],
    propTypes: {
        resources: PropTypes.arrayOf(PropTypes.object).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            audioPlayer: HTMLAudioElement,
        })
        return {
            selectedIndex: 0,
            renderingDialogBox: false,
            showingDialogBox: false,
            audioURL: null,
        };
    },

    /**
     * Return the number of resources
     *
     * @return {Number}
     */
    getResourceCount: function() {
        return this.props.resources.length;
    },

    /**
     * Return the index of the currently selected resource
     *
     * @return {Number}
     */
    getSelectedResourceIndex: function() {
        var maxIndex = this.getResourceCount() - 1;
        var index = Math.min(this.state.selectedIndex, maxIndex);
        return index;
    },

    /**
     * Return the currently selected resource
     *
     * @return {Number}
     */
    getSelectedResource: function() {
        var index = this.getSelectedResourceIndex();
        return (index !== -1) ? this.props.resources[index] : null;
    },

    /**
     * Select a resource by index
     *
     * @param  {Number} index
     *
     * @return {Promise<Number>}
     */
    selectResource: function(index) {
        return new Promise((resolve, reject) => {
            var count = this.getResourceCount();
            if (index >= 0 && index < count) {
                this.setState({ selectedIndex: index }, () => {
                    resolve(index);
                });
            } else {
                resolve(this.getSelectedResourceIndex());
            }
        });
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="media-view">
                <div className="container">
                    {this.renderResource()}
                    {this.renderNavigation()}
                    {this.renderAudioPlayer()}
                    {this.renderDialogBox()}
                </div>
            </div>
        );
    },

    /**
     * Render navigation bar when there are multiple resources
     *
     * @return {ReactElement}
     */
    renderNavigation: function() {
        var count = this.getResourceCount();
        if (count <= 1) {
            return null;
        }
        var index = Math.min(count - 1, this.state.selectedIndex);
        var directionProps = {
            index,
            count,
            onBackwardClick: this.handleBackwardClick,
            onForwardClick: this.handleForwardClick,
        };
        return (
            <div className="navigation">
                <div className="right">
                    <MediaButton.Direction {...directionProps} />
                </div>
            </div>
        );
    },

    /**
     * Render audio player when an audio file was selected
     *
     * @return {[type]}
     */
    renderAudioPlayer: function() {
        if (!this.state.audioURL) {
            return null;
        }
        var audioProps = {
            ref: this.components.setters.audioPlayer,
            src: this.state.audioURL,
            autoPlay: true,
            controls: true,
            onEnded: this.handleAudioEnded,
        };
        return <audio {...audioProps} />;
    },

    /**
     * Render dialog box
     *
     * @return {ReactElement|null}
     */
    renderDialogBox: function() {
        if (!this.state.renderingDialogBox) {
            return null;
        }
        var zoomableResources = getZoomableResources(this.props.resources);
        var index = this.getSelectedResourceIndex();
        var zoomableIndex = _.indexOf(zoomableResources, this.props.resources[index]);
        var dialogProps = {
            show: this.state.showingDialogBox,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,

            locale: this.props.locale,
            theme: this.props.theme,

            onClose: this.handleDialogClose,
        };
        return <MediaDialogBox {...dialogProps} />;
    },

    /**
     * Render image or video poster
     *
     * @return {ReactElement}
     */
    renderResource: function() {
        var count = this.props.resources.length;
        var index = Math.min(count - 1, this.state.selectedIndex);
        var res = this.props.resources[index];
        switch (res.type) {
            case 'image': return this.renderImage(res, index);
            case 'video': return this.renderVideo(res, index);
            case 'audio': return this.renderAudio(res, index);
            case 'website': return this.renderWebsite(res, index);
        }
    },

    /**
     * Render image
     *
     * @param  {Object} res
     * @param  {Number} key
     *
     * @return {ReactElement}
     */
    renderImage: function(res, key) {
        return (
            <div key={key} className="image" onClick={this.handleImageClick}>
                {this.renderImageElement(res)}
            </div>
        );
    },

    /**
     * Render video poster
     *
     * @param  {Object} res
     * @param  {Number} key
     *
     * @return {ReactElement}
     */
    renderVideo: function(res, key) {
        var className = 'video';
        var poster = this.renderImageElement(res);
        if (!poster) {
            className += ' posterless';
        }
        return (
            <div key={key} className={className} onClick={this.handleVideoClick}>
                {poster}
                <div className="overlay">
                    <div className="icon">
                        <i className="fa fa-play-circle-o" />
                    </div>
                    <div className="duration">
                        {DurationIndicator.format(res.duration)}
                    </div>
                </div>
            </div>
        );
    },

    /**
     * Render audio player
     *
     * @param  {Object} res
     * @param  {Number} key
     *
     * @return {ReactElement}
     */
    renderAudio: function(res, key) {
        var className = 'audio';
        var url = this.props.theme.getImageURL(res);
        if (!url) {
            className += ' posterless';
        }
        var action = (!this.state.audioURL) ? 'play' : 'stop';
        return (
            <div key={key} className={className} onClick={this.handleAudioClick}>
                {this.renderImageElement(res)}
                <div className="overlay">
                    <div className="icon">
                        <i className={`fa fa-${action}-circle`} />
                    </div>
                    <div className="duration">
                        {DurationIndicator.format(res.duration)}
                    </div>
                </div>
            </div>
        )
    },

    /**
     * Render website poster
     *
     * @param  {Object} res
     * @param  {Number} key
     *
     * @return {ReactElement}
     */
    renderWebsite: function(res, key) {
        return (
            <div key={key} className="website">
                <a href={res.url} target="_blank">
                    {this.renderImageElement(res)}
                    <div className="overlay hidden">
                        <div className="icon">
                            <i className="fa fa-external-link" />
                        </div>
                    </div>
                </a>
            </div>
        );
    },

    /**
     * Render image of resource (image/video/website)
     *
     * @param  {Object} res
     *
     * @return {[type]}
     */
    renderImageElement: function(res) {
        return <ResourceView resource={res} theme={this.props.theme} />;
    },

    /**
     * Stop playing audio
     */
    pauseAudio: function() {
        var audioPlayer = this.components.audioPlayer;
        if (audioPlayer) {
            audioPlayer.pause();
        }
    },

    /**
     * Called when user clicks backward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleBackwardClick: function(evt) {
        var index = this.getSelectedResourceIndex();
        return this.selectResource(index - 1);
    },

    /**
     * Called when user clicks forward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleForwardClick: function(evt) {
        var index = this.getSelectedResourceIndex();
        return this.selectResource(index + 1);
    },

    /**
     * Called when user clicks on image preview
     *
     * @param  {Event} evt
     */
    handleImageClick: function(evt) {
        this.setState({
            showingDialogBox: true,
            renderingDialogBox: true,
        });
    },

    /**
     * Called when user clicks on video poster
     *
     * @param  {Event} evt
     */
    handleVideoClick: function(evt) {
        this.pauseAudio();
        this.setState({
            showingDialogBox: true,
            renderingDialogBox: true,
        });
    },

    /**
     * Called when user clicks on audio preview
     *
     * @param  {Event} evt
     */
    handleAudioClick: function(evt) {
        if (!this.state.audioURL) {
            var res = this.getSelectedResource();
            var version = chooseAudioVersion(res);
            var audioURL = this.props.theme.getAudioURL(res, { version });
            this.setState({ audioURL });
        } else {
            this.setState({ audioURL: null });
        }
    },

    /**
     * Called when audio playback ends
     *
     * @param  {Event} evt
     */
    handleAudioEnded: function(evt) {
        this.setState({ audioURL: null });
    },

    /**
     * Called when user closes dialog box
     *
     * @param  {Event} evt
     */
    handleDialogClose: function(evt) {
        this.setState({ showingDialogBox: false }, () => {
            setTimeout(() => {
                this.setState({ renderingDialogBox: false });
            }, 1000);
        });
    },
});

var getZoomableResources = Memoize(function(resources) {
    return _.filter(resources, (res) => {
        switch (res.type) {
            case 'image':
            case 'video':
                return true;
        }
    })
});

/**
 * Choose a version of the audio
 *
 * @param  {Object} res
 *
 * @return {String}
 */
function chooseAudioVersion(res) {
    return _.first(_.keys(res.versions)) || null;
}
