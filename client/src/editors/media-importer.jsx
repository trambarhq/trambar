import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import React, { useState, useImperativeHandle } from 'react';
import { useListener } from 'relaks';
import * as MediaLoader from 'common/media/media-loader.mjs';
import * as MediaTagReader from 'common/media/media-tag-reader.mjs';
import * as QuickStart from 'common/media/quick-start.mjs';
import * as BlobReader from 'common/transport/blob-reader.mjs';
import ResourceTypes from 'common/objects/types/resource-types.mjs';

// widgets
import PhotoCaptureDialogBoxBrowser from '../dialogs/photo-capture-dialog-box-browser.jsx';
import PhotoCaptureDialogBoxCordova from '../dialogs/photo-capture-dialog-box-cordova.jsx';
import AudioCaptureDialogBoxBrowser from '../dialogs/audio-capture-dialog-box-browser.jsx';
import AudioCaptureDialogBoxCordova from '../dialogs/audio-capture-dialog-box-cordova.jsx';
import VideoCaptureDialogBoxBrowser from '../dialogs/video-capture-dialog-box-browser.jsx';
import VideoCaptureDialogBoxCordova from '../dialogs/video-capture-dialog-box-cordova.jsx';

import './media-editor.scss';

/**
 * Component for media capturing and file importing. It'll start render a
 * specific dialog box when capture() is invoked by the parent component.
 * It also contains the code for importing files from a file input or
 * drag and drop event.
 */
function MediaImporter(props, ref) {
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
        const newIndex = _.indexOf(newList, resource);
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
        const acceptable = _.filter(files, (file) => {
            const type = MediaLoader.extractFileCategory(file.type);
            return _.includes(types, type);
        });
        if (_.isEmpty(acceptable)) {
            return 0;
        }
        // add placeholders first
        const placeholders = _.map(acceptable, (file) => {
            return {
                type: MediaLoader.extractFileCategory(file.type),
                pending: `import-${++importCount}`,
                imported: true,
            };
        });
        let newList = appendResources(resources, placeholders, limit);
        let newIndex = _.indexOf(newList, placeholders[0]);
        triggerChangeEvent(newList, newIndex);

        // import each file, replacing its placeholder
        const imported = [];
        let failure = false;
        for (let [ index, file ] of _.entries(acceptable)) {
            try {
                const resource = await importFile(file);
                const placeholder = placeholders[index];
                const placeholderIndex = _.indexOf(newList, placeholder);
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
                newIndex = _.indexOf(newList, imported[0]);
                triggerChangeEvent(newList, newIndex);
            } else {
                // restore the original list
                triggerChangeEvent(resources);
            }
        }
    }

    async function importFile(file) {
        const type = MediaLoader.extractFileCategory(file.type);
        if (_.includes(types, type)) {
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
            const meta = await MediaLoader.getImageMetadata(file);
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
                format: MediaLoader.extractFileFormat(file.type),
                filename: file.name,
                imported: true,
            };
        }
    }

    async function importVideoFile(file) {
        // if file is in a QuickTime container, make sure metadata is
        // at the beginning of the file; if video wasn't processed,
        // use the original file
        const blob = await QuickStart.process(file) || file;
        const payload = payloads.add('video');
        // upload file in small chunks
        const stream = payloads.stream().pipe(blob);
        payload.attachStream(stream);
        try {
            const meta = await MediaLoader.getVideoMetadata(blob);
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
                format: MediaLoader.extractFileFormat(file.type),
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
            const meta = await MediaLoader.getAudioMetadata(file);
            const audio = {
                type: 'audio',
                payload_token: payload.id,
                format: meta.format,
                duration: meta.duration,
                filename: file.name,
                imported: true,
            };
            const imageBlob = await MediaTagReader.extractAlbumArt(file);
            if (imageBlob) {
                const meta = await MediaLoader.getImageMetadata(imageBlob);
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
        if (/<img\b/i.test(html) && _.includes(types, 'image')) {
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
                const newIndex = _.indexOf(newList, resource);
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
}

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
        const newList = _.slice(originalList);
        const added = {};
        for (let resource of resources) {
            if (!added[resource.type]) {
                _.remove(newList, { type: resource.type });
                newList.push(resource);
                added[resource.type] = true;
            }
        }
        return newList;
    } else {
        return _.concat(originalList, resources);
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

const component = React.forwardRef(MediaImporter);

component.defaultProps = {
    types: ResourceTypes,
    limit: Infinity,
};

export {
    component as default,
    component as MediaImporter,
};
