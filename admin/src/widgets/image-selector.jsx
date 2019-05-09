import _ from 'lodash';
import React, { useState, useImperativeHandle, useCallback } from 'react';
import * as MediaLoader from 'common/media/media-loader.mjs';
import * as ResourceUtils from 'common/objects/utils/resource-utils.mjs';

// widgets
import ImageCroppingDialogBox from '../dialogs/image-cropping-dialog-box.jsx';
import ImageAlbumDialogBox from '../dialogs/image-album-dialog-box.jsx';
import ResourceView from 'common/widgets/resource-view.jsx';

import './image-selector.scss';

/**
 * Widget for selecting an image, either from the image album or from the
 * user's computer. When desiredWidth and desiredHeight are specified,
 * it provides the option to crop the selected image.
 */
function ImageSelector(props, ref) {
    const { database, env, payloads, readOnly, children, onChange } = props;
    const { resources, desiredWidth, desiredHeight, purpose } = props;
    const { t } = env.locale;
    const [ cropping, setCropping ] = useState(false);
    const [ showingAlbum, setShowingAlbum ] = useState(false);
    const [ instance ] = useState({ value: resources });
    const image = _.find(resources, { type: 'image' });

    useImperativeHandle(ref, () => {
        return instance;
    });

    const handleChooseClick = useCallback((evt) => {
        setShowingAlbum(true);
    });
    const handleCropClick = useCallback((evt) => {
        setCropping(true);
    });
    const handleAlbumDialogCancel = useCallback((evt) => {
        setShowingAlbum(false);
    });
    const handleCroppingDialogCancel = useCallback((evt) => {
        setCropping(false);
    });
    const handleImageSelect = useCallback((evt) => {
        const newImage = _.clone(evt.image);
        newImage.type = 'image';
        setShowingAlbum(false);
        setImage(newImage);
    }, [ setImage ]);
    const handleImageSectionSelect = useCallback((evt) => {
        const newImage = _.clone(image);
        newImage.clip = evt.clippingRect;
        setCropping(false);
        setImage(newImage);
    }, [ setImage, image ]);
    const handleUploadChange = useCallback(async (evt) => {
        const file = evt.target.files[0];
        if (file) {
            const payload = payloads.add('image').attachFile(file);
            const meta = await MediaLoader.getImageMetadata(file);
            const newImage = {
                payload_token: payload.id,
                width: meta.width,
                height: meta.height,
                format: meta.format,
                type: 'image',
            };
            setImage(newImage);
        }
    }, [ payloads, setImage ]);
    const handleImageClick = useCallback((evt) => {
        // open URL in pop-up instead of a tab
        const url = evt.currentTarget.href;
        if (url) {
            const width = parseInt(evt.currentTarget.getAttribute('data-width'));
            const height = parseInt(evt.currentTarget.getAttribute('data-height'));
            openPopup(url, width, height);
            evt.preventDefault();
        }
    });

    const classNames = [ 'image-selector' ];
    if (readOnly) {
        classNames.push('readonly')
    }
    return (
        <div className={classNames.join(' ')}>
            <label>{children}</label>
            <div className="contents">
                {renderImage()}
                {renderOptions()}
            </div>
            {renderCroppingDialogBox()}
            {renderAlbumDialogBox()}
        </div>
    );

    function renderImage() {
        const height = 120;
        if (image) {
            const fullResURL = ResourceUtils.getImageURL(image, { clip: null, remote: true }, env);
            const linkProps = {
                href: fullResURL,
                target: '_blank',
                'data-width': image.width,
                'data-height': image.height,
                onClick: handleImageClick,
            };
            const viewProps = {
                resource: image,
                clip: !!(desiredWidth && desiredHeight),
                height: height,
                env,
            };
            return (
                <div className="image">
                    <a {...linkProps}>
                        <ResourceView {...viewProps} />
                    </a>
                </div>
            );
        } else {
            let width;
            if (desiredWidth && desiredHeight) {
                width = Math.round(desiredWidth * height / desiredHeight);
            } else {
                width = 160;
            }
            return (
                <div className="image">
                    <div className="placeholder" style={{ width, height }}>
                        <i className="fa fa-photo" />
                    </div>
                </div>
            );
        }
    }

    function renderOptions() {
        return (
            <div className="options">
                {renderChooseOption()}
                {renderUploadOption()}
                {renderResizeOption()}
            </div>
        )
    }

    function renderResizeOption() {
        if (!desiredWidth || !desiredHeight) {
            return null;
        }
        const props = { className: 'option' };
        if (!readOnly) {
            props.onClick = handleCropClick;
        }
        if (!image) {
            props.className += ' disabled';
        }
        return (
            <div {...props}>
                <i className="fa fa-crop" />
                {' '}
                {t('image-selector-crop-image')}
            </div>
        );
    }

    function renderChooseOption() {
        if (!purpose) {
            return null;
        }
        const props = { className: 'option' };
        if (!readOnly) {
            props.onClick = handleChooseClick;
        }
        return (
            <div {...props}>
                <i className="fa fa-th" />
                {' '}
                {t('image-selector-choose-from-album')}
            </div>
        );
    }

    function renderUploadOption() {
        const inputProps = {
            type: 'file',
            value: '',
            accept: 'image/*',
            disabled: readOnly,
            onChange: handleUploadChange,
        };
        return (
            <label className="option">
                <i className="fa fa-upload" />
                {' '}
                {t('image-selector-upload-file')}
                <input {...inputProps} />
            </label>
        );
    }

    function renderCroppingDialogBox() {
        if (!(image && desiredWidth && desiredHeight)) {
            return null;
        }
        const dialogBoxProps = {
            show: cropping,
            image,
            desiredWidth,
            desiredHeight,
            env,
            onSelect: handleImageSectionSelect,
            onCancel: handleCroppingDialogCancel,
        };
        return <ImageCroppingDialogBox {...dialogBoxProps} />;
    }

    function renderAlbumDialogBox() {
        let dialogBoxProps = {
            show: showingAlbum,
            purpose,
            image,
            database,
            env,
            payloads,
            onSelect: handleImageSelect,
            onCancel: handleAlbumDialogCancel,
        };
        return <ImageAlbumDialogBox {...dialogBoxProps} />;
    }

    function setImage(image) {
        instance.value = updateResource(resources, image, desiredWidth, desiredHeight);
        if (onChange) {
            onChange({
                type: 'change',
                target: instance,
            });
        }
    }
}

function updateResource(resources, image, desiredWidth, desiredHeight) {
    if (desiredWidth && desiredHeight) {
        // center a clipping rect over the image if there's none
        if (!image.clip) {
            const ratio = desiredWidth / desiredHeight;
            let width = image.width;
            let height = Math.round(width / ratio);
            let left = 0;
            let top = Math.round((image.height - height) / 2);
            if (top < 0) {
                height = image.height;
                width = Math.round(height * ratio);
                left = Math.round((image.width - width) / 2);
                top = 0;
            }
            image = _.clone(image);
            image.clip = { left, top, width, height };
        }
    }
    resources = _.slice(resources);
    const index = _.findIndex(resources, { type: 'image' });
    if (index !== -1) {
        if (image) {
            resources[index] = image;
        } else {
            resources.splice(index, 1);
        }
    } else {
        resources.push(image);
    }
    return resources;
}

function openPopup(url, width, height) {
    let windowWidth = width;
    let windowHeight = height;
    const availableWidth = screen.width - 100;
    const availableHeight = screen.height - 100;
    if (windowWidth > availableWidth) {
        windowWidth = availableWidth;
        windowHeight = Math.round(windowWidth * height / width);
    }
    if (windowHeight > availableHeight) {
        windowHeight = availableHeight;
        windowWidth = Math.round(windowHeight * width / height);
    }
    const windowLeft = Math.round((screen.width - windowHeight) / 3);
    const windowTop = Math.round((screen.height - windowHeight) / 3);
    const params = [
        `left=${windowLeft}`,
        `top=${windowTop}`,
        `width=${windowWidth}`,
        `height=${windowHeight}`,
    ];
    window.open(url, '_blank', params.join(','));

}

const component = React.forwardRef(ImageSelector);

component.defaultProps = {
    resources: [],
    readOnly: false,
};

export {
    component as default,
    component as ImageSelector,
};
