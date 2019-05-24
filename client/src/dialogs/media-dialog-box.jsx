import _ from 'lodash';
import Promise from 'bluebird';
import React, { useState, useReducer, useCallback, useEffect } from 'react';
import Hammer from 'hammerjs';
import * as ResourceUtils from 'common/objects/utils/resource-utils.mjs';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ResourceView } from 'common/widgets/resource-view.jsx';

import './media-dialog-box.scss';

/**
 * Dialog box for showing attached photos and videos.
 */
function MediaDialogBox(props) {
    const { env, resources, selectedIndex, onClose } = props;
    const { t } = env.locale;
    const [ resourceIndex, changeResourceIndex ] = useReducer((index, value) => {
        if (value === 'inc') {
            index++;
        } else if (value === 'dec') {
            index--;
        } else {
            index = value;
        }
        index = _.clamp(index, 0, resources.length - 1);
        return index;
    }, selectedIndex);

    const handleThumbnailClick = useCallback((evt) => {
        const index = parseInt(evt.currentTarget.getAttribute('data-index'));
        changeResourceIndex(index);
    });
    const handleDownloadClick = useCallback((evt) => {
        let resource = resources[resourceIndex];
        if (resource) {
            // create a link then simulate a click
            const link = document.createElement('A');
            const url = ResourceUtils.getURL(resource, { original: true }, env);
            const pageAddress = `${location.protocol}//${location.host}`;
            link.href = url;
            // download only works when it's same origin
            if (env.address === pageAddress) {
                link.download = res.filename || '';
            } else {
                link.target = '_blank';
            }
            link.click();
        }
    }, [ resourceIndex ]);
    const handleKeyDown = useCallback((evt) => {
        if (evt.keyCode === 39) {           // right arrow
            changeResourceIndex('inc');
        } else if (evt.keyCode == 37) {     // left arrow
            changeResourceIndex('dec');
        } else {
            return;
        }
        evt.preventDefault();
    });
    const handleMouseWheel = useCallback((evt) => {
        let delta;
        if (Math.abs(evt.deltaX) >= Math.abs(evt.deltaY)) {
            delta = evt.deltaX;
        } else {
            delta = evt.deltaY;
        }
        if (delta > 0) {
            changeResourceIndex('inc');
        } else if (delta < 0) {
            changeResourceIndex('dec');
        } else {
            return;
        }
        evt.preventDefault();
    });
    const handleSwipeLeft = useCallback((evt) => {
        changeResourceIndex('inc');
    });
    const handleSwipeRight = useCallback((evt) => {
        changeResourceIndex('dec');
    });

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousewheel', handleMouseWheel);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousewheel', handleMouseWheel);
        };
    });
    useEffect(() => {
        const hammer = new Hammer(document.body);
        hammer.on('swipeleft', handleSwipeLeft);
        hammer.on('swiperight', handleSwipeRight);
        return () => {
            hammer.off('swipeleft', handleSwipeLeft);
            hammer.off('swiperight', handleSwipeRight);
            hammer.element.style.touchAction = '';
            hammer.destroy();
        };
    });

    return (
        <div className="media-dialog-box">
            {renderView()}
            <div className="controls">
                {renderThumbnails()}
                {renderButtons()}
            </div>
        </div>
    );

    function renderView() {
        const resource = resources[resourceIndex];
        if (!resource) {
            return;
        }
        let { viewportWidth, viewportHeight } = env;
        if (env.isWiderThan('double-col')) {
            viewportWidth -= 100;
            viewportHeight -= 200;
        } else {
            viewportWidth -= 10;
            viewportHeight -= 100;
        }
        const viewportAspect = viewportWidth / viewportHeight;
        let maxWidth, maxHeight;
        for (let res of resources) {
            const { width, height } = ResourceUtils.getDimensions(res, { clip: null }, env);
            if (!(maxWidth >= width)) {
                maxWidth = width;
            }
            if (!(maxHeight >= height)) {
                maxHeight = height;
            }
        }
        const maxAspect = maxWidth / maxHeight;
        if (viewportAspect > maxAspect) {
            if (maxHeight > viewportHeight) {
                maxHeight = viewportHeight;
                maxWidth = Math.round(maxHeight * maxAspect);
            }
        } else {
            if (maxWidth > viewportWidth) {
                maxWidth = viewportWidth;
                maxHeight = Math.round(maxWidth / maxAspect);
            }
        }
        const style = { width: maxWidth, height: maxHeight };
        let contents;
        switch (resource.type) {
            case 'image':
                contents = renderImage(resource, maxWidth, maxHeight);
                break;
            case 'video':
                contents = renderVideo(resource, maxWidth, maxHeight);
                break;
        }
        return <div className="container" style={style}>{contents}</div>;
    }

    function renderImage(resource, maxWidth, maxHeight) {
        let { width, height } = resource;
        if (width > maxWidth) {
            height = Math.round(maxWidth * (height / width));
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = Math.round(maxHeight * (width / height));
            height = maxHeight;
        }
        const props = {
            // prevent image element from being reused, so when changing from
            // one image to the next the current image doesn't momentarily
            // appears with the dimensions of the next image
            key: resourceIndex,
            resource,
            width,
            height,
            clip: false,
            showAnimation: true,
            env,
        };
        return <ResourceView {...props} />;
    }

    function renderVideo(resource) {
        const url = ResourceUtils.getVideoURL(resource, {}, env);
        const { width, height } = ResourceUtils.getDimensions(resource, { clip: null }, env);
        const posterURL = ResourceUtils.getImageURL(resource, {
            width,
            height,
            clip: null,
            quality: 60
        }, env);
        const props = {
            ref: 'video',
            src: url,
            controls: true,
            autoPlay: true,
            poster: posterURL,
        };
        return <video {...props} />;
    }

    function renderThumbnails() {
        return (
            <div className="links">
                {_.map(resources, renderThumbnail)}
            </div>
        );
    }

    function renderThumbnail(resource, i) {
        const classNames = [ 'thumbnail' ];
        if (i === resourceIndex) {
            classNames.push('selected');
        }
        const frameProps = {
            className: classNames.join(' '),
            'data-index': i,
            onClick: handleThumbnailClick,
        };
        const viewProps = { resource, width: 28, height: 28, env };
        return (
            <div key={i} {...frameProps}>
                <ResourceView {...viewProps} />
            </div>
        );
    }

    function renderButtons() {
        const downloadButtonProps = {
            label: t('media-download-original'),
            emphasized: false,
            hidden: !env.isWiderThan('double-col'),
            onClick: handleDownloadClick,
        };
        const closeButtonProps = {
            label: t('media-close'),
            emphasized: true,
            onClick: onClose,
        };
        return (
            <div className="buttons">
                <PushButton {...downloadButtonProps} />
                <PushButton {...closeButtonProps} />
            </div>
        );
    }
}

const component = Overlay.create(MediaDialogBox);

export {
    component as default,
    component as MediaDialogBox,
};
