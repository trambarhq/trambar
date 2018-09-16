import _ from 'lodash';
import React, { PureComponent } from 'react';
import HTTPRequest from 'transport/http-request';
import Memoize from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import Payload from 'transport/payload';
import * as ImageCropping from 'media/image-cropping';

// widgets
import Overlay from 'widgets/overlay';
import MediaButton from 'widgets/media-button';
import MediaDialogBox from 'dialogs/media-dialog-box';
import ResourceView from 'widgets/resource-view';
import DurationIndicator from 'widgets/duration-indicator';

import './media-view.scss';

class MediaView extends PureComponent {
    static displayName = 'MediaView';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            audioPlayer: HTMLAudioElement,
        });
        this.state = {
            selectedIndex: 0,
            renderingDialogBox: false,
            showingDialogBox: false,
            audioURL: null,
        };
    }

    /**
     * Return the number of resources
     *
     * @return {Number}
     */
    getResourceCount() {
        return this.props.resources.length;
    }

    /**
     * Return the index of the currently selected resource
     *
     * @return {Number}
     */
    getSelectedResourceIndex() {
        let maxIndex = this.getResourceCount() - 1;
        let index = Math.min(this.state.selectedIndex, maxIndex);
        return index;
    }

    /**
     * Return the currently selected resource
     *
     * @return {Number}
     */
    getSelectedResource() {
        let index = this.getSelectedResourceIndex();
        return (index !== -1) ? this.props.resources[index] : null;
    }

    /**
     * Select a resource by index
     *
     * @param  {Number} index
     *
     * @return {Promise<Number>}
     */
    selectResource(index) {
        return new Promise((resolve, reject) => {
            let count = this.getResourceCount();
            if (index >= 0 && index < count) {
                this.setState({ selectedIndex: index }, () => {
                    resolve(index);
                });
            } else {
                resolve(this.getSelectedResourceIndex());
            }
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
        let count = this.getResourceCount();
        if (count <= 1) {
            return null;
        }
        let index = Math.min(count - 1, this.state.selectedIndex);
        let directionProps = {
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
    }

    /**
     * Render audio player when an audio file was selected
     *
     * @return {[type]}
     */
    renderAudioPlayer() {
        if (!this.state.audioURL) {
            return null;
        }
        let audioProps = {
            ref: this.components.setters.audioPlayer,
            src: this.state.audioURL,
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
        if (!this.state.renderingDialogBox) {
            return null;
        }
        let zoomableResources = getZoomableResources(this.props.resources);
        let index = this.getSelectedResourceIndex();
        let zoomableIndex = _.indexOf(zoomableResources, this.props.resources[index]);
        let dialogProps = {
            show: this.state.showingDialogBox,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,

            locale: this.props.locale,
            theme: this.props.theme,

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
        let count = this.props.resources.length;
        let index = Math.min(count - 1, this.state.selectedIndex);
        let res = this.props.resources[index];
        switch (res.type) {
            case 'image': return this.renderImage(res, index);
            case 'video': return this.renderVideo(res, index);
            case 'audio': return this.renderAudio(res, index);
            case 'website': return this.renderWebsite(res, index);
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
        let className = 'audio';
        let url = this.props.theme.getImageURL(res);
        if (!url) {
            className += ' posterless';
        }
        let action = (!this.state.audioURL) ? 'play' : 'stop';
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
        let props = {
            resource: res,
            theme: this.props.theme,
            width: this.props.width,
            height: this.props.width,
            mosaic: true,
        };
        return <ResourceView {...props} />;
    }

    /**
     * Stop playing audio
     */
    pauseAudio() {
        let audioPlayer = this.components.audioPlayer;
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
        let index = this.getSelectedResourceIndex();
        return this.selectResource(index - 1);
    }

    /**
     * Called when user clicks forward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleForwardClick = (evt) => {
        let index = this.getSelectedResourceIndex();
        return this.selectResource(index + 1);
    }

    /**
     * Called when user clicks on image preview
     *
     * @param  {Event} evt
     */
    handleImageClick = (evt) => {
        this.setState({
            showingDialogBox: true,
            renderingDialogBox: true,
        });
    }

    /**
     * Called when user clicks on video poster
     *
     * @param  {Event} evt
     */
    handleVideoClick = (evt) => {
        this.pauseAudio();
        this.setState({
            showingDialogBox: true,
            renderingDialogBox: true,
        });
    }

    /**
     * Called when user clicks on audio preview
     *
     * @param  {Event} evt
     */
    handleAudioClick = (evt) => {
        if (!this.state.audioURL) {
            let res = this.getSelectedResource();
            let version = chooseAudioVersion(res);
            let audioURL = this.props.theme.getAudioURL(res, { version });
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
        this.setState({ showingDialogBox: false }, () => {
            setTimeout(() => {
                this.setState({ renderingDialogBox: false });
            }, 1000);
        });
    }
}

let getZoomableResources = Memoize(function(resources) {
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

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MediaView.propTypes = {
        resources: PropTypes.arrayOf(PropTypes.object).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        width: PropTypes.number.isRequired,
    };
}
