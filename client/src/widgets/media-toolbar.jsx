import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import HeaderButton from 'widgets/header-button';

import './media-toolbar.scss';

/**
 * Toolbar for attaching media to a story. It's responsbile for rendering
 * the appropripate dialog box when a button is clicked.
 *
 * @extends PureComponent
 */
class MediaToolbar extends PureComponent {
    static displayName = 'MediaToolbar';

    constructor(props) {
        super(props);
        this.state = { capturing: false };
    }

    /**
     * Count the type of resources attached to story
     *
     * @return {Object}
     */
    getResourceCounts() {
        let { story } = this.props;
        let counts = {
            photo: 0,
            video: 0,
            audio: 0,
            file: 0,
        };
        let resources = _.get(story, 'details.resources');
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
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env } = this.props;
        let { capturing } = this.state;
        let { t } = env.locale;
        let counts = this.getResourceCounts();
        let canCaptureImage = _.includes(env.recorders, 'image');
        let canCaptureVideo = _.includes(env.recorders, 'video');
        let canCaptureAudio = _.includes(env.recorders, 'audio');
        let photoButtonProps = {
            label: t('story-photo'),
            icon: 'camera',
            hidden: !counts.photo && !canCaptureImage,
            disabled: !canCaptureImage,
            highlighted: (counts.photo > 0 || capturing === 'image'),
            onClick: this.handlePhotoClick,
        };
        let videoButtonProps = {
            label: t('story-video'),
            icon: 'video-camera',
            hidden: !counts.video && !canCaptureVideo,
            disabled: !canCaptureVideo,
            highlighted: (counts.video > 0 || capturing === 'video'),
            onClick: this.handleVideoClick,
        };
        let audioButtonProps = {
            label: t('story-audio'),
            icon: 'microphone',
            hidden: !counts.audio && !canCaptureAudio,
            disabled: !canCaptureAudio,
            highlighted: (counts.audio > 0 || capturing === 'audio'),
            onClick: this.handleAudioClick,
        };
        let selectButtonProps = {
            label: t('story-file'),
            icon: 'file-photo-o',
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
    }

    /**
     * Inform parent component that certain action should occur
     *
     * @param  {String} action
     * @param  {Object|undefined} props
     */
    triggerActionEvent(action, props) {
        let { onAction } = this.props;
        if (onAction) {
            onAction(_.extend({
                type: 'action',
                target: this,
                action,
            }, props));
        }
    }

    /**
     * Called when user click on photo button
     *
     * @param  {Event} evt
     */
    handlePhotoClick = (evt) => {
        this.triggerActionEvent('photo-capture');
    }

    /**
     * Called when user click on video button
     *
     * @param  {Event} evt
     */
    handleVideoClick = (evt) => {
        this.triggerActionEvent('video-capture');
    }

    /**
     * Called when user click on audio button
     *
     * @param  {Event} evt
     */
    handleAudioClick = (evt) => {
        this.triggerActionEvent('audio-capture');
    }

    /**
     * Called after user has selected a file
     *
     * @param  {Event} evt
     */
    handleFileSelect = (evt) => {
        let files = evt.target.files;
        if (!_.isEmpty(files)) {
            this.triggerActionEvent('file-import', { files });
        }
    }
}

export {
    MediaToolbar as default,
    MediaToolbar,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MediaToolbar.propTypes = {
        story: PropTypes.object.isRequired,
        capturing: PropTypes.oneOf([ 'image', 'video', 'audio' ]),
        env: PropTypes.instanceOf(Environment).isRequired,
        onAction: PropTypes.func,
    };
}
