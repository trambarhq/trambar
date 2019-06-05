import _ from 'lodash';
import RelaksMediaCapture from 'relaks-media-capture';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useListener } from 'relaks';
import { useLatest, useAfterglow, useConfirmation, useSelectionBuffer, useDraftBuffer } from 'common/hooks.mjs';

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

function useMarkdownResources(resources, env) {
    const [ name, setName ] = useState('');
    const [ audioURL, setAudioURL ] = useState('');
    const [ zoomed, setZoomed ] = useState(false, true);
    const unreferenced = _.slice(resources);
    const referenced = [];
    const zoomable = _.filter(resources, (res) => {
        switch (res.type) {
            case 'image':
            case 'video':
                return true;
        }
    });

    const onReference = useListener((evt) => {
        const res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            referenced.push(res);
            _.pull(unreferenced, res);
            _.pull(zoomable, res);
            const url = ResourceUtils.getMarkdownIconURL(res, evt.forImage, env);
            return { href: url, title: evt.name };
        }
    });
    const onClose = useListener((evt) => {
        setZoomed(false);
    });
    const onClick = useListener((evt) => {
        evt.preventDefault();

        let target = evt.target;
        if (target.viewportElement) {
            target = target.viewportElement;
        }
        let name;
        if (target.tagName === 'svg') {
            let title = target.getElementsByTagName('title')[0];
            if (title) {
                name = title.textContent;
            }
        } else {
            name = evt.target.title;
        }
        if (name) {
            let res = Markdown.findReferencedResource(resources, name);
            if (res) {
                if (res.type === 'image' || res.type === 'video') {
                    setName(name);
                    setZoomed(true);
                } else if (res.type === 'website') {
                    window.open(res.url, '_blank');
                } else if (res.type === 'audio') {
                    const version = _.first(_.keys(res.versions));
                    const selected = ResourceUtils.getAudioURL(res, { version }, env);
                    setAudioURL((selected === audioURL) ? null : selected);
                }
            }
        } else {
            openPopUpWindow(target);
        }
    });
    const onAudioEnd = useListener((evt) => {
        setAudioURL('');
    });
    const context = {
        zoomed,
        unreferenced,
        referenced,
        zoomable,
        selected: _.find(resources, name),

        onReference,
        onClick,
        onClose,
        onAudioEnd,
    };
    return context;
}

function openPopUpWindow(target) {
    let url, options;
    if (target.tagName === 'A') {
        url = target.href;
    } else if (target.tagName === 'IMG') {
        let src = target.getAttribute('src');
        let targetRect = target.getBoundingClientRect();
        let width = target.naturalWidth + 50;
        let height = target.naturalHeight + 50;
        let left = targetRect.left + window.screenLeft;
        let top = targetRect.top + window.screenTop;
        options = `width=${width},height=${height},left=${left},top=${top}status=no,menubar=no`;
        url = target.src;
    }
    window.open(url, '_blank', options);
}

export {
    useLatest,
    useConfirmation,
    useDialogHandling,
    useStreamHandling,
    useMediaCapture,
    useSelectionBuffer,
    useDraftBuffer,
    useMarkdownResources,
};
