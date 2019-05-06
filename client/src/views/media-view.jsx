import _ from 'lodash';
import React, { PureComponent } from 'react';
import HTTPRequest from 'common/transport/http-request.mjs';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import ComponentRefs from 'common/utils/component-refs.mjs';
import Payload from 'common/transport/payload.mjs';
import * as ResourceUtils from 'common/objects/utils/resource-utils.mjs';
import * as ImageCropping from 'common/media/image-cropping.mjs';

// widgets
import MediaButton from '../widgets/media-button.jsx';
import MediaDialogBox from '../dialogs/media-dialog-box';
import ResourceView from 'common/widgets/resource-view.jsx';
import DurationIndicator from '../widgets/duration-indicator.jsx';

import './media-view.scss';

/**
 * Component for displaying media resources attached to a story or reaction.
 *
 * @extends PureComponent
 */
class MediaView extends PureComponent {
    static displayName = 'MediaView';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            audioPlayer: HTMLAudioElement,
        });
        this.state = {
            selectedIndex: 0,
            showingDialogBox: false,
            audioURL: null,
        };
    }

    /**
     * Select a resource by index
     *
     * @param  {Number} index
     *
     * @return {Promise<Number>}
     */
    selectResource(index) {
        let { resources } = this.props;
        return new Promise((resolve, reject) => {
            if (index < 0) {
                index = 0;
            } else if (index > resources.length - 1) {
                index = resources.length - 1;
            }
            this.setState({ selectedIndex: index }, () => {
                resolve(index);
            });
        });
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
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
    }

    /**
     * Render navigation bar when there are multiple resources
     *
     * @return {ReactElement}
     */
    renderNavigation() {
        let { resources } = this.props;
        let { selectedIndex } = this.state;
        if (resources.length <= 1) {
            return null;
        }
        if (selectedIndex > resources.length - 1) {
            selectedIndex = resources.length - 1;
        }
        let directionProps = {
            index: selectedIndex,
            count: resources.length,
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
    }

    /**
     * Render audio player when an audio file was selected
     *
     * @return {[type]}
     */
    renderAudioPlayer() {
        let { setters } = this.components;
        let { audioURL } = this.state;
        if (!audioURL) {
            return null;
        }
        let audioProps = {
            ref: setters.audioPlayer,
            src: audioURL,
            autoPlay: true,
            controls: true,
            onEnded: this.handleAudioEnded,
        };
        return <audio {...audioProps} />;
    }

    /**
     * Render dialog box
     *
     * @return {ReactElement|null}
     */
    renderDialogBox() {
        let { env, resources } = this.props;
        let { showingDialogBox, selectedIndex } = this.state;
        if (selectedIndex > resources.length - 1) {
            selectedIndex = resources.length - 1;
        }
        let res = resources[selectedIndex];
        if (!res) {
            return null;
        }
        let zoomableResources = getZoomableResources(resources);
        let zoomableIndex = _.indexOf(zoomableResources, res);
        let dialogProps = {
            show: showingDialogBox,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,
            env,
            onClose: this.handleDialogClose,
        };
        return <MediaDialogBox {...dialogProps} />;
    }

    /**
     * Render image or video poster
     *
     * @return {ReactElement}
     */
    renderResource() {
        let { resources } = this.props;
        let { selectedIndex } = this.state;
        if (selectedIndex > resources.length - 1) {
            selectedIndex = resources.length - 1;
        }
        let res = resources[selectedIndex];
        if (!res) {
            return null;
        }
        switch (res.type) {
            case 'image': return this.renderImage(res, selectedIndex);
            case 'video': return this.renderVideo(res, selectedIndex);
            case 'audio': return this.renderAudio(res, selectedIndex);
            case 'website': return this.renderWebsite(res, selectedIndex);
        }
    }

    /**
     * Render image
     *
     * @param  {Object} res
     * @param  {Number} key
     *
     * @return {ReactElement}
     */
    renderImage(res, key) {
        return (
            <div key={key} className="image" onClick={this.handleImageClick}>
                {this.renderImageElement(res)}
            </div>
        );
    }

    /**
     * Render video poster
     *
     * @param  {Object} res
     * @param  {Number} key
     *
     * @return {ReactElement}
     */
    renderVideo(res, key) {
        let className = 'video';
        let poster = this.renderImageElement(res);
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
    }

    /**
     * Render audio player
     *
     * @param  {Object} res
     * @param  {Number} key
     *
     * @return {ReactElement}
     */
    renderAudio(res, key) {
        let { audioURL } = this.state;
        let className = 'audio';
        let poster = this.renderImageElement(res);
        if (!poster) {
            className += ' posterless';
        }
        let action = (!audioURL) ? 'play' : 'stop';
        return (
            <div key={key} className={className} onClick={this.handleAudioClick}>
                {poster}
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
    }

    /**
     * Render website poster
     *
     * @param  {Object} res
     * @param  {Number} key
     *
     * @return {ReactElement}
     */
    renderWebsite(res, key) {
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
    }

    /**
     * Render image of resource (image/video/website)
     *
     * @param  {Object} res
     *
     * @return {[type]}
     */
    renderImageElement(res) {
        let { env, width } = this.props;
        let url = ResourceUtils.getImageURL(res, { original: true }, env);
        if (!url) {
            return null;
        }
        let props = {
            resource: res,
            width: width,
            height: width,
            showMosaic: true,
            env,
        };
        return <ResourceView {...props} />;
    }

    /**
     * Stop playing audio
     */
    pauseAudio() {
        let { audioPlayer } = this.components;
        if (audioPlayer) {
            audioPlayer.pause();
        }
    }

    /**
     * Called when user clicks backward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleBackwardClick = (evt) => {
        let { selectedIndex } = this.state;
        return this.selectResource(selectedIndex - 1);
    }

    /**
     * Called when user clicks forward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleForwardClick = (evt) => {
        let { selectedIndex } = this.state;
        return this.selectResource(selectedIndex + 1);
    }

    /**
     * Called when user clicks on image preview
     *
     * @param  {Event} evt
     */
    handleImageClick = (evt) => {
        this.setState({ showingDialogBox: true });
    }

    /**
     * Called when user clicks on video poster
     *
     * @param  {Event} evt
     */
    handleVideoClick = (evt) => {
        this.pauseAudio();
        this.setState({ showingDialogBox: true });
    }

    /**
     * Called when user clicks on audio preview
     *
     * @param  {Event} evt
     */
    handleAudioClick = (evt) => {
        let { env, resources } = this.props;
        let { selectedIndex, audioURL } = this.state;
        if (!audioURL) {
            if (selectedIndex > resources.length - 1) {
                selectedIndex = resources.length - 1;
            }
            let res = resources[selectedIndex];
            let version = chooseAudioVersion(res);
            let audioURL = ResourceUtils.getAudioURL(res, { version }, env);
            this.setState({ audioURL });
        } else {
            this.setState({ audioURL: null });
        }
    }

    /**
     * Called when audio playback ends
     *
     * @param  {Event} evt
     */
    handleAudioEnded = (evt) => {
        this.setState({ audioURL: null });
    }

    /**
     * Called when user closes dialog box
     *
     * @param  {Event} evt
     */
    handleDialogClose = (evt) => {
        this.setState({ showingDialogBox: false });
    }
}

const getZoomableResources = memoizeWeak(null, function(resources) {
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

export {
    MediaView as default,
    MediaView,
};

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MediaView.propTypes = {
        resources: PropTypes.arrayOf(PropTypes.object).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        width: PropTypes.number.isRequired,
    };
}
