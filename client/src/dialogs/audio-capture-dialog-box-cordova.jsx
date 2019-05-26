import _ from 'lodash';
import React, { useEffect } from 'react';
import * as MediaLoader from 'common/media/media-loader.mjs';
import CordovaFile from 'common/transport/cordova-file.mjs';

/**
 * Non-visual component that uses the Media Capture Cordiva plug-in to capture
 * an audio clip on an mobile phone.
 */
function AudioCaptureDialogBoxCordova(props) {
    const { payloads, show } = props;
    const { onClose, onCapture, onCapturePending, onCaptureError } = props;

    useEffect(() => {
        const handleSuccess = async (mediaFiles) => {
            if (onClose) {
                onClose({});
            }

            const mediaFile = mediaFiles[0];
            if (mediaFile) {
                if (onCapturePending) {
                    onCapturePending({ resourceType: 'audio' });
                }
                try {
                    const mediaFileData = await MediaLoader.getFormatData(mediaFile);
                    const file = new CordovaFile(mediaFile.fullPath);
                    const [ type, format ] = _.split(mediaFile.type, '/');
                    const payload = payloads.add('audio');
                    payload.attachFile(file);
                    const res = {
                        type: 'audio',
                        payload_token: payload.id,
                        format: format,
                        width: mediaFileData.width,
                        height: mediaFileData.height,
                        filename: mediaFile.name,
                        duration: mediaFileData.duration * 1000,
                    };
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
                    duration: 15 * 60 * 60,
                    limit: 1,
                };
                capture.captureAudio(handleSuccess, handleFailure, options);
            }
        }

        if (show) {
            startCapture();
        }
    }, [ show ]);

    return null;
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
            permissions.READ_EXTERNAL_STORAGE,
            permissions.WRITE_EXTERNAL_STORAGE,
        ], successCB, errorCB);
    });
}

export {
    AudioCaptureDialogBoxCordova as default,
    AudioCaptureDialogBoxCordova,
};
