import _ from 'lodash';
import React, { useState } from 'react';
import Relaks, { useListener } from 'relaks';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';

import './image-preview-dialog-box.scss';

function ImagePreviewDialogBox(props) {
    const { database, env, image, onClose } = props;
    const { t } = env.locale;

    const handleOpenClick = useListener((evt) => {
        window.open(image.source, '_blank');
    });

    return (
        <div className="image-preview-dialog-box">
            {renderImage()}
            {renderButtons()}
        </div>
    );

    function renderImage() {
        if (image) {
            const maxWidth = env.viewportWidth - 100;
            const maxHeight = env.viewportHeight - 150;
            const maxAspectRatio = maxWidth / maxHeight;
            const aspectRation = image.width / image.height;
            let imageWidth, imageHeight;
            if (aspectRation > maxAspectRatio) {
                imageWidth = Math.min(maxWidth, image.width);
            } else {
                imageHeight = Math.min(maxHeight, image.height);
            }
            const options = {
                devicePixelRatio: env.devicePixelRatio,
                imageWidth,
                imageHeight,
                imageServer: env.address,
            };
            return image.richText(options);
        }
    }

    function renderButtons() {
        const closeProps = {
            onClick: onClose,
        };
        const source = getImageSource(image);
        const openProps = {
            hidden: !source,
            onClick: handleOpenClick,
        };
        const openLabel = (source) ? t(`image-preview-${source}`) : '';
        return (
            <div className="buttons">
                <div className="left">
                    <PushButton {...openProps}>{openLabel}</PushButton>
                </div>
                <div className="right">
                    <PushButton {...closeProps}>{t('image-preview-close')}</PushButton>
                </div>
            </div>
        );
    }
}

const isOneDrive = /^https:\/\/(1drv\.ms|onedrive\.live\.com)\//;
const isDropbox = /^https:\/\/(www\.dropbox\.com)\//;

function getImageSource(image) {
    if (image) {
        const { source } = image;
        if (isOneDrive.test(source)) {
            return 'onedrive';
        } else if (isDropbox.test(source)) {
            return 'dropbox';
        }
    }
}

const component = Overlay.create(ImagePreviewDialogBox);

export {
    component as default,
    component as ImagePreviewDialogBox,
};
