import React, { useState, useRef, useImperativeHandle, useEffect } from 'react';
import * as MediaLoader from '../media/media-loader.mjs';

/**
 * A component for displaying a SVG file, with proper support for zooming
 * and clipping.
 */
function VectorView(props, ref) {
    const { url, clippingRect, title, onError, onLoad, ...otherProps } = props;
    const [ svg, setSVG ] = useState(null);
    const containerRef = useRef();
    const [ instance ] = useState({
        src: null,
        originX: 0,
        originY: 0,
        zoomX: 1,
        zoomY: 1,
        naturalWidth: 4,
        naturalHeight: 4,
    });

    useImperativeHandle(ref, () => {
        return instance;
    });

    useEffect(() => {
        instance.src = url;
        MediaLoader.loadSVG(url).then((loadedSVG) => {
            setSVG(loadedSVG);
        }).catch((err) => {
            if (onError) {
                onError({ type: 'error', target: instance });
            }
        });
    }, [ url ]);
    useEffect(() => {
        const container = containerRef.current;
        while (container.firstChild) {
            container.removeChild(svg.firstChild);
        }
        if (svg) {
            let child;
            while (child = svg.firstChild) {
                svg.removeChild(child);
                container.appendChild(child);
            }
            let width = svg.width.baseVal.value;
            let height = svg.height.baseVal.value;
            let viewBox = svg.viewBox.baseVal;
            if (!width) {
                width = viewBox.width;
            }
            if (!height) {
                height = viewBox.height;
            }
            if (!width) {
                width = 1000;
            }
            if (!height) {
                height = 1000;
            }
            instance.originX = viewBox.x;
            instance.originY = viewBox.y;
            instance.zoomX = (viewBox.width) ? viewBox.width / width : 1;
            instance.zoomY = (viewBox.height) ? viewBox.height / height : 1;
            instance.naturalWidth = width;
            instance.naturalHeight = height;
        } else {
            instance.originX = 0;
            instance.originY = 0;
            instance.zoomX = 1;
            instance.zoomY = 1;
            instance.naturalWidth = 4;
            instance.naturalHeight = 4;
        }
    }, [ svg ]);
    useEffect(() => {
        const container = containerRef.current;
        const { originX, originY, zoomX, zoomY, naturalWidth, naturalHeight } = instance;
        let clip = clippingRect;
        if (!clip) {
            clip = {
                left: 0,
                top: 0,
                width: naturalWidth,
                height: naturalHeight,
            };
        }
        const viewBox = container.viewBox.baseVal;
        const width = container.width.baseVal;
        const height = container.height.baseVal;
        viewBox.x = clip.left * zoomX + originX;
        viewBox.y = clip.top * zoomY + originY;
        viewBox.width = clip.width * zoomX;
        viewBox.height = clip.height * zoomY;
        width.value = clip.width;
        height.value = clip.height;
    }, [ clippingRect ]);
    useEffect(() => {
        const container = containerRef.current;
        let child = container.getElementsByTagName('title')[0];
        if (title) {
            if (!child) {
                child = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                container.appendChild(child);
            }
            child.textContent = title;
        } else {
            if (child) {
                container.removeChild(child);
            }
        }
    }, [ title ]);
    useEffect(() => {
        if (onLoad) {
            onLoad({  type: 'load', target: instance });
        }
    }, [ svg ]);

    const svgProps = {
        ref: containerRef,
        viewBox: '0 0 4 4',
        width: 4,
        height: 4,
        ...otherProps
    };
    return <svg {...svgProps} />;
}

const component = React.forwardRef(VectorView);

export {
    component as default,
    component as VectorView,
};
