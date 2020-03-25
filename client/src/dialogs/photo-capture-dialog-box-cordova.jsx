import React from 'react';
import { useAsyncEffect } from 'relaks';
import { getImageMetadata } from 'common/media/media-loader.js';
import { CordovaFile } from 'common/transport/cordova-file.js';

/**
 * Non-visual component that uses the Camera Cordova plugin to take a photo.
 */
export function PhotoCaptureDialogBoxCordova(props) {
  const { payloads, cameraDirection, show } = props;
  const { onClose, onCapture, onCapturePending, onCaptureError } = props;

  useAsyncEffect(async () => {
    if (show) {
      const handleSuccess = async (imageURL) => {
        const file = new CordovaFile(imageURL);
        if (onClose) {
          onClose({});
        }
        if (onCapturePending) {
          onCapturePending({ resourceType: 'image' });
        }
        try {
          await file.obtainMetadata();
          const meta = await getImageMetadata(file);
          const payload = payloads.add('image').attachFile(file);
          const res = {
            type: 'image',
            payload_token: payload.id,
            format: meta.format,
            width: meta.width,
            height: meta.height,
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
      const handleFailure = (message) => {
        if (onClose) {
          onClose({});
        }
      };

      const camera = navigator.camera;
      if (camera) {
        let direction;
        if (cameraDirection === 'front') {
          direction = Camera.Direction.FRONT;
        } else if (cameraDirection === 'back') {
          direction = Camera.Direction.BACK;
        }
        const options = {
          quality: 50,
          destinationType: Camera.DestinationType.FILE_URI,
          sourceType: Camera.PictureSourceType.CAMERA,
          encodingType: Camera.EncodingType.JPEG,
          mediaType: Camera.MediaType.PICTURE,
          cameraDirection: direction,
          allowEdit: false,
        };
        camera.getPicture(handleSuccess, handleFailure, options);
      }
    }
  }, [ show ]);

  return null;
}
