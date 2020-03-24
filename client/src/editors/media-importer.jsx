import _ from 'lodash';
import Moment from 'moment';
import React, { useState, useImperativeHandle } from 'react';
import { useListener } from 'relaks';
import { optimizeVideo } from 'common/media/quick-start.js';
import ResourceTypes from 'common/objects/types/resource-types.js';
import {
  extractFileCategory,
  extractFileFormat,
  getVideoMetadata,
  getAudioMetadata,
  getImageMetadata,
} from 'common/media/media-loader.js';
import { extractAlbumArt } from 'common/media/media-tag-reader.js';

// widgets
import { PhotoCaptureDialogBoxBrowser } from '../dialogs/photo-capture-dialog-box-browser.jsx';
import { PhotoCaptureDialogBoxCordova } from '../dialogs/photo-capture-dialog-box-cordova.jsx';
import { AudioCaptureDialogBoxBrowser } from '../dialogs/audio-capture-dialog-box-browser.jsx';
import { AudioCaptureDialogBoxCordova } from '../dialogs/audio-capture-dialog-box-cordova.jsx';
import { VideoCaptureDialogBoxBrowser } from '../dialogs/video-capture-dialog-box-browser.jsx';
import { VideoCaptureDialogBoxCordova } from '../dialogs/video-capture-dialog-box-cordova.jsx';

import './media-editor.scss';

/**
 * Component for media capturing and file importing. It'll start render a
 * specific dialog box when capture() is invoked by the parent component.
 * It also contains the code for importing files from a file input or
 * drag and drop event.
 */
export const MediaImporter = React.forwardRef((props, ref) => {
  const { resources } = props;
  const { payloads, env, cameraDirection, types, limit } = props;
  const { onCaptureStart, onCaptureEnd, onChange } = props;
  const [ capturing, setCapturing ] = useState(null);
  const [ originalResourceList, setOriginalResourceList ] = useState(null);
  const [ instance ] = useState({});

  instance.capture = capture;
  instance.importFiles = importFiles;
  instance.importDataItems = importDataItems;
  useImperativeHandle(ref, () => instance);

  const handleClose = useListener((evt) => {
    setCapturing(null);
  });
  const handleCapturePending = useListener((evt) => {
    const placeholder = {
      type: evt.resourceType,
      pending: `capture-${++captureCount}`
    };
    const newList = appendResources(resources, [ placeholder ], limit);
    setOriginalResourceList(resources);
  });
  const handleCaptureError = useListener((evt) => {
    if (originalResourceList) {
      triggerChangeEvent(originalResourceList);
      setOriginalResourceList(null);
    }
  });
  const handleCapture = useListener((evt) => {
    const { format } = evt.resource;
    const ext = (format === 'jpeg') ? 'jpg' : format;
    const filename = getFilenameFromTime('.' + ext);
    const resource = {
      filename,
      ...evt.resource
    };
    const oldList = originalResourceList || resources;
    const newList = appendResources(oldList, [ resource ], limit);
    const newIndex = newList.indexOf(resource);
    triggerChangeEvent(newList, newIndex);
  });

  function capture(type) {
    setCapturing(type);
    if (onCaptureStart) {
      onCaptureStart({});
    }
  }

  async function importFiles(files) {
    // filter for acceptable files
    const acceptable = files.filter((file) => {
      const type = extractFileCategory(file.type);
      return types.includes(type);
    });
    if (acceptable.length === 0) {
      return 0;
    }
    // add placeholders first
    const placeholders = _.map(acceptable, (file) => {
      return {
        type: extractFileCategory(file.type),
        pending: `import-${++importCount}`,
        imported: true,
      };
    });
    const newList = appendResources(resources, placeholders, limit);
    const newIndex = newList.indexOf(placeholders[0]);
    triggerChangeEvent(newList, newIndex);

    // import each file, replacing its placeholder
    const imported = [];
    let failure = false;
    for (let [ index, file ] of _.entries(acceptable)) {
      try {
        const resource = await importFile(file);
        const placeholder = placeholders[index];
        const placeholderIndex = newList.indexOf(placeholder);
        newList = _.slice(newList);
        newList[placeholderIndex] = resource;
        imported.push(resource);
        triggerChangeEvent(newList, newIndex);
      } catch (err) {
        failure = true;
      }
    }
    if (failure) {
      if (imported) {
        // add only those that were successfully imported
        newList = appendResources(resources, imported, limit);
        newIndex = newList.indexOf(imported[0]);
        triggerChangeEvent(newList, newIndex);
      } else {
        // restore the original list
        triggerChangeEvent(resources);
      }
    }
  }

  async function importFile(file) {
    const type = extractFileCategory(file.type);
    if (types.includes(type)) {
      switch (type) {
        case 'image':
          return importImageFile(file);
        case 'video':
          return importVideoFile(file);
        case 'audio':
          return importAudioFile(file);
      }
    }
  }

  async function importImageFile(file) {
    const payload = payloads.add('image').attachFile(file);
    try {
      const meta = await getImageMetadata(file);
      return {
        type: 'image',
        payload_token: payload.id,
        width: meta.width,
        height: meta.height,
        format: meta.format,
        filename: file.name,
        imported: true,
      };
    } catch (err) {
      // not a format that the browser recognizes
      return {
        type: 'image',
        payload_token: payload.id,
        format: extractFileFormat(file.type),
        filename: file.name,
        imported: true,
      };
    }
  }

  async function importVideoFile(file) {
    // if file is in a QuickTime container, make sure metadata is
    // at the beginning of the file; if video wasn't processed,
    // use the original file
    const blob = await optimizeVideo(file) || file;
    const payload = payloads.add('video');
    // upload file in small chunks
    const stream = payloads.stream().pipe(blob);
    payload.attachStream(stream);
    try {
      const meta = await getVideoMetadata(blob);
      payload.attachFile(meta.poster, 'poster')
      return {
        type: 'video',
        payload_token: payload.id,
        width: meta.width,
        height: meta.height,
        format: meta.format,
        duration: meta.duration,
        filename: file.name,
        imported: true,
      };
    } catch (err) {
      // not MP4--poster needs to be generated on server side
      payload.attachStep('main', 'poster')
      return {
        type: 'video',
        payload_token: payload.id,
        format: extractFileFormat(file.type),
        filename: file.name,
        imported: true,
      };
    }
  }

  async function importAudioFile(file) {
    const payload = payloads.add('audio');
    const stream = payloads.stream().pipe(file);
    payload.attachStream(stream);
    try {
      const meta = await getAudioMetadata(file);
      const audio = {
        type: 'audio',
        payload_token: payload.id,
        format: meta.format,
        duration: meta.duration,
        filename: file.name,
        imported: true,
      };
      const imageBlob = await extractAlbumArt(file);
      if (imageBlob) {
        const meta = await getImageMetadata(imageBlob);
        audio.width = meta.width;
        audio.height = meta.height;
      }
      payload.attachFile(imageBlob, 'poster');
      return audio;
    } catch (err) {
      return {
        type: 'audio',
        payload_token: payload.id,
        format: MediaLoader.extractFileFormat(file.type),
        filename: file.name,
        imported: true,
      };
    }
  }

  async function importDataItems(items) {
    const strings = await retrieveDataItemTexts(items);
    const html = strings['text/html'];
    // see if it's an image being dropped
    if (/<img\b/i.test(html) && types.includes('image')) {
      const m = /<img\b.*?\bsrc="(.*?)"/.exec(html);
      if (m) {
        const url = _.unescape(m[1]);
        const filename = url.replace(/.*\/([^\?#]*).*/, '$1') || undefined;
        const payload = payloads.add('image').attachURL(url);
        const resource = {
          type: 'image',
          payload_token: payload.id,
          filename: filename,
        };
        const newList = appendResources(resources, [ resource ], limit);
        const newIndex = newList.indexOf(resource);
        triggerChangeEvent(newList, newIndex);
        addResources([ resource ]);
      }
    }
  }

  function triggerChangeEvent(list, index) {
    if (onChange) {
      onChange({ resources: list, selection: index });
    }
  }

  return (
    <div>
      {renderPhotoDialog()}
      {renderAudioDialog()}
      {renderVideoDialog()}
    </div>
  );

  function renderPhotoDialog() {
    const props = {
      show: (capturing === 'image'),
      cameraDirection,
      payloads,
      env,
      onClose: handleClose,
      onCapturePending: handleCapturePending,
      onCaptureError: handleCaptureError,
      onCapture: handleCapture,
    };
    if (env.platform === 'browser') {
      return <PhotoCaptureDialogBoxBrowser {...props} />;
    } else if (env.platform === 'cordova') {
      return <PhotoCaptureDialogBoxCordova {...props} />;
    }
  }

  function renderVideoDialog() {
    const props = {
      show: (capturing === 'video'),
      cameraDirection,
      payloads,
      env,
      onClose: handleClose,
      onCapturePending: handleCapturePending,
      onCaptureError: handleCaptureError,
      onCapture: handleCapture,
    };
    if (env.platform === 'browser') {
      return <VideoCaptureDialogBoxBrowser {...props} />;
    } else if (env.platform === 'cordova') {
      return <VideoCaptureDialogBoxCordova {...props} />;
    }
  }

  function renderAudioDialog() {
    const props = {
      show: (capturing === 'audio'),
      payloads,
      env,
      onClose: handleClose,
      onCapturePending: handleCapturePending,
      onCaptureError: handleCaptureError,
      onCapture: handleCapture,
    };
    if (env.platform === 'browser') {
      return <AudioCaptureDialogBoxBrowser {...props} />;
    } else if (env.platform === 'cordova') {
      return <AudioCaptureDialogBoxCordova {...props} />;
    }
  }
});

let importCount = 0;
let captureCount = 0;

async function retrieveDataItemTexts(items) {
  // since the items are ephemeral (they only exist within the event handler),
  // we need to call getAsString() on all of them synchronously and not in
  // a callback (i.e. no await between calls)
  const strings = {};
  const promises = _.map(items, (item) => {
    if (item.kind === 'string') {
      if (/^text\/(html|uri-list)/.test(item.type)) {
        return new Promise((resolve, reject) => {
          item.getAsString((s) => {
            strings[item.type] = s;
            resolve();
          });
        });
      }
    }
  });
  await Promise.all(promises);
  return strings;
}

function appendResources(originalList, resources, limit) {
  if (limit === 1) {
    const newList = [ ...originalList ];
    const added = {};
    for (let resource of resources) {
      if (!added[resource.type]) {
        const index = newList.findIndex(r => r.type === resource.type);
        if (index !== -1) {
          newList[index] = resource;
        } else {
          newList.push(resource);
        }
        added[resource.type] = true;
      }
    }
    return newList;
  } else {
    return [ ...originalList, ...resources ];
  }
}

function getInnerText(html) {
  if (html) {
    const node = document.createElement('DIV');
    node.innerHTML = html.replace(/<.*?>/g, '');
    website.title = node.innerText;
  }
}

function getFilenameFromTime(ext) {
  return _.toUpper(Moment().format('YYYY-MMM-DD-hhA')) + ext;
}

MediaImporter.defaultProps = {
  types: ResourceTypes,
  limit: Infinity,
};
