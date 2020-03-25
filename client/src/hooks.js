import RelaksMediaCapture from 'relaks-media-capture';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useListener, useSaveBuffer } from 'relaks';
import { findReferencedResource } from 'common/utils/markdown.js';
import { getMarkdownIconURL, getAudioURL, isZoomable } from 'common/objects/utils/resource-utils.js';
import { useLatest, useAfterglow, useConfirmation, useSelectionBuffer, useDraftBuffer } from 'common/hooks.js';
import { AsyncDraftBuffer } from 'common/hooks.js';

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
  const unreferenced = resources?.slice() || [];
  const unreferencedZoomable = unreferenced.filter(isZoomable);
  const referenced = [];
  const referencedZoomable = [];

  const onReference = useListener((evt) => {
    const res = findReferencedResource(resources, evt.name);
    if (res) {
      referenced.push(res);
      unreferenced.splice(unreferenced.indexOf(res), 1);
      if (isZoomable(res)) {
        referencedZoomable.push(res);
        unreferencedZoomable.splice(unreferencedZoomable.indexOf(res), 1);
      }
      const href = getMarkdownIconURL(res, evt.type, env);
      const hrefHTML = href;
      const title = evt.name;
      const titleHTML = title;
      return { href, hrefHTML, title, titleHTML };
    }
  });
  const onClose = useListener((evt) => {
    setZoomed(false);
  });
  const onClick = useListener((evt) => {
    let target = evt.target;
    if (target.viewportElement) {
      target = target.viewportElement;
    }
    const style = getComputedStyle(target);
    if (style.cursor === 'pointer') {
      evt.preventDefault();
    } else {
      // ignore it since it's not supposed to be clickable
      return;
    }

    let name;
    if (target.tagName === 'svg') {
      const title = target.getElementsByTagName('title')[0];
      if (title) {
        name = title.textContent;
      }
    } else {
      name = evt.target.title;
    }
    if (name) {
      const res = findReferencedResource(resources, name);
      if (res) {
        if (isZoomable(res)) {
          setName(name);
          setZoomed(true);
        } else if (res.type === 'website') {
          window.open(res.url, '_blank');
        } else if (res.type === 'audio') {
          const version = Object.keys(res.versions)[0];
          const selected = getAudioURL(res, { version }, env);
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
  const selected = findReferencedResource(resources, name);
  const context = {
    zoomed,
    unreferenced,
    unreferencedZoomable,
    referenced,
    referencedZoomable,
    selected,

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
  if (url) {
    window.open(url, '_blank', options);
  }
}

export {
  useLatest,
  useAfterglow,
  useConfirmation,
  useDialogHandling,
  useStreamHandling,
  useMediaCapture,
  useSelectionBuffer,
  useDraftBuffer,
  useMarkdownResources,
};
