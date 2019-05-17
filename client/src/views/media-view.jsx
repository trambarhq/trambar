import _ from 'lodash';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ResourceUtils from 'common/objects/utils/resource-utils.mjs';

// widgets
import { MediaButton } from '../widgets/media-button.jsx';
import { MediaDialogBox } from '../dialogs/media-dialog-box';
import { ResourceView } from 'common/widgets/resource-view.jsx';
import { formatDuration } from '../widgets/duration-indicator.jsx';

import {
    useDialogHandling,
} from '../hooks.mjs';

import './media-view.scss';

/**
 * Component for displaying media resources attached to a story or reaction.
 */
function MediaView(props) {
    const { env, width, resources } = props;
    const audioPlayerRef = useRef();
    const [ selectedIndex, setSelectedIndex ] = useState(0);
    const [ audioURL, setAudioURL ] = useState(null);
    const maxResourceIndex = resources.length - 1;
    const resourceIndex = _.min([ selectedIndex, maxResourceIndex]);
    const resource = resources[resourceIndex];
    const zoomableResources = _.filter(resources, (res) => {
        switch (res.type) {
            case 'image':
            case 'video':
                return true;
        }
    });

    const handleBackwardClick = useCallback((evt) => {
        if (resourceIndex > 0) {
            setSelectedIndex(resourceIndex - 1);
        }
    }, [ resourceIndex ])
    const handleForwardClick = useCallback((evt) => {
        if (resourceIndex < maxResourceIndex) {
            setSelectedIndex(resourceIndex + 1);
        }
    }, [ resourceIndex, maxResourceIndex ]);
    const handleAudioClick = useCallback((evt) => {
        if (!audioURL) {
            const version = _.first(_.keys(resource.versions)) || null;
            const audioURL = ResourceUtils.getAudioURL(resource, { version }, env);
            setAudioURL(audioURL);
        } else {
            setAudioURL(null);
        }
    }, [ resource, audioURL ]);
    const handleAudioEnded = useCallback((evt) => {
        setAudioURL(null);
    });
    const [ showingDialogBox, handleImageClick, handleDialogClose ] = useDialogHandling();

    useEffect(() => {
        // pause audio when dialog box is open
        if (showingDialogBox) {
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
            }
        }
    }, [ showingDialogBox ]);

    return (
        <div className="media-view">
            <div className="container">
                {renderResource()}
                {renderNavigation()}
                {renderAudioPlayer()}
                {renderDialogBox()}
            </div>
        </div>
    );

    function renderNavigation() {
        if (maxResourceIndex <= 0) {
            return null;
        }
        const directionProps = {
            index: resourceIndex,
            count: resources.length,
            onBackwardClick: handleBackwardClick,
            onForwardClick: handleForwardClick,
        };
        return (
            <div className="navigation">
                <div className="right">
                    <MediaButton.Direction {...directionProps} />
                </div>
            </div>
        );
    }

    function renderAudioPlayer() {
        if (!audioURL) {
            return null;
        }
        const audioProps = {
            src: audioURL,
            autoPlay: true,
            controls: true,
            onEnded: handleAudioEnded,
        };
        return <audio ref={audioPlayerRef} {...audioProps} />;
    }

    function renderDialogBox() {
        if (!resource) {
            return null;
        }
        const zoomableIndex = _.indexOf(zoomableResources, resource);
        const dialogProps = {
            show: showingDialogBox,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,
            env,
            onClose: handleDialogClose,
        };
        return <MediaDialogBox {...dialogProps} />;
    }

    function renderResource() {
        if (!resource) {
            return null;
        }
        switch (resource.type) {
            case 'image': return renderImage();
            case 'video': return renderVideo();
            case 'audio': return renderAudio();
            case 'website': return renderWebsite();
        }
    }

    function renderImage() {
        return (
            <div key={resourceIndex} className="image" onClick={handleImageClick}>
                {renderImageElement()}
            </div>
        );
    }

    function renderVideo() {
        const classNames = [ 'video' ];
        const poster = renderImageElement();
        if (!poster) {
            classNames.push('posterless');
        }
        return (
            <div key={resourceIndex} className={classNames.join(' ')} onClick={handleImageClick}>
                {poster}
                <div className="overlay">
                    <div className="icon">
                        <i className="fa fa-play-circle-o" />
                    </div>
                    <div className="duration">
                        {DurationIndicator(resource.duration)}
                    </div>
                </div>
            </div>
        );
    }

    function renderAudio() {
        const classNames = [ 'audio' ];
        const poster = renderImageElement();
        if (!poster) {
            classNames.join('posterless');
        }
        const action = (!audioURL) ? 'play' : 'stop';
        return (
            <div key={resourceIndex} className={classNames.join(' ')} onClick={handleAudioClick}>
                {poster}
                <div className="overlay">
                    <div className="icon">
                        <i className={`fa fa-${action}-circle`} />
                    </div>
                    <div className="duration">
                        {DurationIndicator(resource.duration)}
                    </div>
                </div>
            </div>
        )
    }

    function renderWebsite(res, key) {
        return (
            <div key={resourceIndex} className="website">
                <a href={resource.url} target="_blank">
                    {renderImageElement()}
                    <div className="overlay hidden">
                        <div className="icon">
                            <i className="fa fa-external-link" />
                        </div>
                    </div>
                </a>
            </div>
        );
    }

    function renderImageElement() {
        const url = ResourceUtils.getImageURL(resource, { original: true }, env);
        if (!url) {
            return null;
        }
        const props = {
            resource,
            width,
            height: width,
            showMosaic: true,
            env,
        };
        return <ResourceView {...props} />;
    }
}

export {
    MediaView as default,
    MediaView,
};
