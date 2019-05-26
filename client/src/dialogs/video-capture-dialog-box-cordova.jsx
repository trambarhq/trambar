import _ from 'lodash';
import React, { useEffect } from 'react';
import * as MediaLoader from 'common/media/media-loader.mjs';
import CordovaFile from 'common/transport/cordova-file.mjs';

/**
 * Non-visual component that uses the Media Capture Cordiva plug-in to capture
 * a video clip on an mobile phone.
 */
function VideoCaptureDialogBoxCordova(props) {
    const { payloads, show } = props;
    const { onClose, onCapture, onCapturePending, onCaptureError } = props;

    useEffect(() => {
        const handleCaptureSuccess = async (mediaFiles) => {
            if (onClose) {
                onClose({});
            }
            const mediaFile = mediaFiles[0];
            if (mediaFile) {
                if (onCapturePending) {
                    onCapturePending({ resourceType: 'video' });
                }
                try {
                    const mediaFileData = await MediaLoader.getFormatData(mediaFile);
                    let fullPath;
                    if (cordova.platformId === 'windows') {
                        fullPath = mediaFile.localURL;
                    } else {
                        fullPath = mediaFile.fullPath;
                    }
                    const file = new CordovaFile(fullPath, mediaFile.type, mediaFile.size);
                    const payload = payloads.add('video');
                    payload.attachFile(file);

                    const res = {
                        type: 'video',
                        payload_token: payload.id,
                        format: MediaLoader.extractFileFormat(mediaFile.type),
                        filename: mediaFile.name,
                        duration: mediaFileData.duration * 1000,
                    };
                    try {
                        const thumbnailURL = await createThumbnail(file);
                        const posterFile = new CordovaFile(thumbnailURL);
                        const poster = await MediaLoader.getImageMetadata(posterFile);
                        payload.attachFile(posterFile, 'poster');
                        // use the poster's width and height, as they're
                        // corrected for camera orientation
                        res.width = poster.width;
                        res.height = poster.height;
                    } catch (err) {
                        // can't generate thumbnail--let the server do it
                        payload.attachStep('main', 'poster')
                    }
                    if (onCapture) {
                        onCapture({ resource });
                    }
                } catch (err) {
                    if (onCaptureError) {
                        onCaptureError({ error: err });
                    }
                }
            }
        };
        const handleFailure = (err) => {
            if (onClose) {
                onClose({});
            }
            if (onCaptureError) {
                onCaptureError({ error: err });
            }
        };

        async startCapture() {
            const capture = navigator.device.capture;
            if (capture) {
                await requestPermissions();
                const options = {
                    duration: 5 * 60 * 60,
                    limit: 1,
                };
                capture.captureVideo(handleSuccess, handleFailure, options);
            }
        }

        if (show) {
            startCapture();
        }
    }, [ show ]);
}

function createThumbnail(file) {
    return new Promise((resolve, reject) => {
        const successCB = (path) => {
            if (cordova.platformId === 'windows') {
                // need to use ms-appdata: URL instead of win32 path
                const backSlashIndex = _.lastIndexOf(path, '\\');
                if (backSlashIndex !== -1) {
                    const filename = path.substr(backSlashIndex + 1);
                    path = cordova.file.dataDirectory + filename;
                }
            }
            resolve(path);
        };
        const errorCB = (err) => {
            reject(new Error(err));
        };
        const options = {
            fileUri: file.fullPath,
            outputFileName: file.name,
            quality: 70
        };
        if (cordova.platformId === 'windows') {
            // on Windows the plugin doesn't automatically add an extension
            options.outputFileName += '.jpg';
        }
        VideoEditor.createThumbnail(successCB, errorCB, options);
    });
}

async function requestPermissions() {
    const permissions = cordova.plugins.permissions;
    if (!permissions || cordova.platformId !== 'android') {
        return;
    }
    return new Promise((resolve, reject) => {
        const successCB = () => {
            resolve();
        };
        const errorCB = (err) => {
            reject(new Error('Unable to obtain permission'));
        };
        permissions.requestPermissions([
            permissions.RECORD_AUDIO,
            permissions.RECORD_VIDEO,
            permissions.READ_EXTERNAL_STORAGE,
            permissions.WRITE_EXTERNAL_STORAGE,
        ], successCB, errorCB);
    });
}

export {
    VideoCaptureDialogBoxCordova as default,
    VideoCaptureDialogBoxCordova,
};
