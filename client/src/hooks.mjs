import _ from 'lodash';
import RelaksMediaCapture from 'relaks-media-capture';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useLatest, useAfterglow, useConfirmation, useSelectionBuffer, useDraftBuffer } from 'common/hooks.mjs';

import { useSaveBuffer, Cancellation } from 'relaks';

function useDialogHandling() {
    const [ open, setOpen ] = useState(false);
    const handleOpen = useCallback(() => {
        setOpen(true);
    });
    const handleClose = useCallback(() => {
        setOpen(false);
    });
    return [ open, handleOpen, handleClose ];
}

function useStreamHandling(payloads) {
    const [ context ] = useState({ current: null });
    context.start = function() {
        this.cancel();
        this.current = payloads.stream();
    };
    context.cancel = function() {
        if (this.current) {
            this.current.cancel();
            this.current = null;
        }
    };
    context.push = function(blob) {
        if (this.current) {
            this.current.push(blob);
        }
    };
    context.close = function() {
        if (this.current) {
            this.current.close();
        }
    };
    return context;
}

function useMediaCapture(options, stream) {
    const [ capture ] = useState(() => {
        return new RelaksMediaCapture(options);
    });
    useEffect(() => {
        const handleCaptureChunk = (evt) => {
            stream.push(evt.blob);
        };
        const handleCaptureEnd = (evt) => {
            stream.close();
        };

        capture.activate();
        capture.addEventListener('chunk', handleCaptureChunk);
        capture.addEventListener('end', handleCaptureEnd);
        return () => {
            capture.deactivate();
            capture.removeEventListener('chunk', handleCaptureChunk);
            capture.removeEventListener('end', handleCaptureEnd);
            capture.clear();
        };
    }, []);
    return capture;
}

export {
    useLatest,
    useConfirmation,
    useDialogHandling,
    useStreamHandling,
    useMediaCapture,
    useSelectionBuffer,
    useDraftBuffer,
};
