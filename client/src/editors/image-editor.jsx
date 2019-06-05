import _ from 'lodash';
import Promise from 'bluebird';
import React, { useState, useMemo, useRef, useImperativeHandle, useEffect } from 'react';
import { useListener } from 'relaks';
import * as BlobManager from 'common/transport/blob-manager.mjs';
import Payload from 'common/transport/payload.mjs';
import * as ImageCropping from 'common/media/image-cropping.mjs';
import * as FocusManager from 'common/utils/focus-manager.mjs';
import * as ResourceUtils from 'common/objects/utils/resource-utils.mjs';

// widgets
import { ImageCropper } from 'common/widgets/image-cropper.jsx';

import './image-editor.scss';

/**
 * Component for adjusting an image's clipping rect (which controls the zoom
 * level as well). Contains logics for loading the full image, either an
 * local image that was selected by the user or an image that was uploaded
 * previously.
 */
function ImageEditor(props, ref) {
    const { env, resource, previewWidth, previewHeight, disabled, children } = props;
    const { t } = env.locale;
    const remoteURL = useMemo(() => {
        const params = { remote: true, original: true };
        return ResourceUtils.getImageURL(resource, params, env);
    }, [ env, resource ]);
    const localURL = useMemo(() => {
        const params = { local: true, original: true };
        return ResourceUtils.getImageURL(resource, params, env);
    }, [ env, resource ]);
    const previewURL = useMemo(() => {
        const params = { remote: true, width: previewWidth, height: previewHeight };
        return ResourceUtils.getImageURL(resource, params, env);
    }, [ env, resource, previewWidth, previewHeight ])
    const [ pendingURL, setPendingURL ] = useState('');
    const [ loadedURL, setLoadedURL ] = useState('');
    const imageCropperRef = useRef();
    const [ instance ] = useState({
        focus: function() {
            if (imageCropperRef.current) {
                imageCropperRef.current.focus();
            }
        }
    });

    useImperativeHandle(ref, () => instance);

    const handleClipRectChange = useListener((evt) => {
        const resourceAfter = { ...resource, clip: evt.rect };
        if (onChange) {
            onChange({ resource: resourceAfter });
        }
    });
    const handleFullImageLoad = useListener((evt) => {
        setLoadedURL(evt.target.src);
    });

    useEffect(() => {
        FocusManager.register(instance, { type: 'ImageEditor' });
        return () => {
            FocusManager.unregister(instance);
        };
    }, []);
    useEffect(() => {
        async function load() {
            await BlobManager.fetch(remoteURL);
        }
        load();
    }, [ remoteURL ]);


    return (
        <div className="image-editor">
            {renderImage()}
            {renderSpinner()}
            {children}
        </div>
    );

    function renderImage() {
        if (localURL) {
            return renderImageCropper();
        } else if (previewURL) {
            return renderPreviewImage();
        } else {
            return renderPlaceholder();
        }
    }

    function renderPreviewImage() {
        const classNames = [ 'preview' ];
        if (disabled) {
            classNames.push('disabled');
        }
        const imageProps = {
            src: previewURL,
            width: previewWidth,
            height: previewHeight
        };
        return (
            <div className={classNames.join(' ')}>
                <img {...imageProps} />
            </div>
        );
    }

    function renderSpinner() {
        if (disabled || localURL || !previewURL) {
            return null;
        }
        return (
            <div className="spinner">
                <i className="fa fa-refresh fa-spin fa-fw" />
            </div>
        );
    }

    function renderImageCropper() {
        const clippingRect = ResourceUtils.getClippingRect(resource, {});
        let props = {
            url: localURL,
            clippingRect,
            vector: (resource.format === 'svg'),
            disabled,
            onChange: handleClipRectChange,
            onLoad: handleFullImageLoad,
        };
        return <ImageCropper ref={imageCropperRef} {...props} />;
    }

    function renderPlaceholder() {
        let message, icon;
        if (resource.width && resource.height) {
            // when the dimensions are known, then the image was available to
            // the client
            message = t('image-editor-upload-in-progress');
            icon = 'cloud-upload';
        } else {
            if (!resource.pending) {
                // not pending locally--we're wait for remote action to complete
                if (resource.type === 'video') {
                    // poster is being generated in the backend
                    message = t('image-editor-poster-extraction-in-progress');
                    icon = 'film';
                } else if (resource.type === 'website') {
                    // web-site preview is being generated
                    message = t('image-editor-page-rendering-in-progress');
                    icon = 'file-image-o';
                } else if (resource.type === 'image') {
                    // image is being copied in the backend
                    message = t('image-editor-image-transfer-in-progress');
                    icon = 'file-image-o';
                }
            }
        }
        return (
            <div className="placeholder">
                <div className="icon">
                    <i className={`fa fa-${icon}`} />
                </div>
                <div className="message">{message}</div>
            </div>
        );
    }
}

ImageEditor.defaultProps = {
    previewWidth: 512,
    previewHeight: 512,
    disabled: false,
};

const component = React.forwardRef(ImageEditor);

export {
    component as default,
    component as ImageEditor,
};
