import React, { useState } from 'react';
import Relaks, { useListener } from 'relaks';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';

import './image-preview-dialog-box.scss';

function ImagePreviewDialogBox(props) {
    const { env, image, onClose } = props;
    const { t } = env.locale;

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
                imageBaseURL: env.address,
            };
            return image.richText(options);
        }
    }

    function renderButtons() {
        const closeProps = {
            onClick: onClose,
        };
        return (
            <div className="buttons">
                <div className="left">
                    {renderLink()}
                </div>
                <div className="right">
                    <PushButton {...closeProps}>{t('image-preview-close')}</PushButton>
                </div>
            </div>
        );
    }

    function renderLink() {
        const source = getImageSource(image);
        if (!source) {
            return;
        }
        return (
            <a href={image.source} className="link" target="_blank">
                {t(`image-preview-${source}`)}
                {' '}
                <i className="fa fa-external-link" />
            </a>
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
