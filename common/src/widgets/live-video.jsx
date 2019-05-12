import React, { useRef, useEffect } from 'react';

/**
 * A video component that accepts a stream or blob as a prop. A workaround for
 * scalar-only limitation of regular HTML elements in React.
 */
function LiveVideo(props) {
    const { srcObject, ...otherProps } = props;
    const videoRef = useRef();

    useEffect(() => {
        const video = videoRef.current;
        if (srcObject instanceof Blob) {
            // srcObject is supposed to accept a blob but that's not
            // currently supported by the browsers
            const url = URL.createObjectURL(srcObject);
            video.url = url;
            return () => {
                URL.revokeObjectURL(url);
            };
        } else if (srcObject) {
            video.srcObject = srcObject;
            video.play();
            return () => {
                video.srcObject = null;
            };
        }
    }, [ srcObject ]);

    return <video ref={videoRef} {...otherProps} />
}

export {
    LiveVideo as default,
    LiveVideo,
};
