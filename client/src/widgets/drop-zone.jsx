import React, { useState } from 'react';
import { useListener } from 'relaks';

import './drop-zone.scss';

/**
 * A component that renders an outline when the user has dragged files from
 * the OS's file manager over it. Children passed to it are rendered within
 * its HTML node. When files are dropped, it'll fire an onDrop event.
 */
function DropZone(props) {
    const { children, onDrop } = props;
    const [ active, setActive ] = useState(false);

    const handleDragEnter = useListener((evt) => {
        setActive(true);
    });
    const handleDragLeave = useListener((evt) => {
        setActive(false);
    });
    const handleDragOver = useListener((evt) => {
        evt.preventDefault();
    });
    const handleDrop = useListener((evt) => {
        evt.preventDefault();
        if (active) {
            const { files, items } = evt.dataTransfer;
            if (onDrop) {
                onDrop({ files, items });
            }
        }
        setActive(false);
        return null;
    });

    return (
        <div className="drop-zone" onDragEnter={handleDragEnter}>
            {children}
            {renderOverlay()}
        </div>
    );

    function renderOverlay() {
        if (!active) {
            return null;
        }
        const handlers = {
            onDragLeave: handleDragLeave,
            onDragOver: handleDragOver,
            onDrop: handleDrop,
        };
        return <div className="overlay" {...handlers} />;
    }
}

export {
    DropZone as default,
    DropZone,
};
