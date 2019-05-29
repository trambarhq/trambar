import _ from 'lodash';
import React, { useState } from 'react';
import Relaks, { useProgress, useListener } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as MediaLoader from 'common/media/media-loader.mjs';
import * as PictureFinder from 'common/objects/finders/picture-finder.mjs';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ResourceView } from 'common/widgets/resource-view.jsx';

import './image-album-dialog-box.scss';

async function ImageAlbumDialogBox(props) {
    const { database, env, payloads, image, purpose } = props;
    const { onSelect, onCancel } = props;
    const { t } = env.locale;
    const db = database.use({ schema: 'global', by: this });
    const [ show ] = useProgress();
    const [ managingImages, setManagingImages ] = useState(false);
    const [ selectedPictureID, setSelectedPictureID ] = useState(0);
    const [ deletionCandidateIDs, setDeletionCandidateIDs ] = useState([]);
    const [ isDropTarget, setIsDropTarget ] = useState(false);

    const handleManageClick = useListener((evt) => {
        setManagingImages(true);
    });
    const handleDoneClick = useListener((evt) => {
        setManagingImages(false);
        setDeletionCandidateIDs([]);
    });
    const handleCancelClick = useListener((evt) => {
        if (onCancel) {
            onCancel({});
        }
    });
    const handleSelectClick = useListener((evt) => {
        const selectedPicture = getSelectedPicture();
        if (onSelect && selectedPicture) {
            onSelect({ image: selectedPicture.details });
        }
    });
    const handleUploadChange = useListener(async (evt) => {
        // make copy of array since it'll disappear when event handler exits
        const files = _.slice(evt.target.files);
        if (files.length) {
            await uploadPictures(files);
        }
    });
    const handleDragEnter = useListener((evt) => {
        setIsDropTarget(true);
    });
    const handleDragLeave = useListener((evt) => {
        setIsDropTarget(false);
    });
    const handleDragOver = useListener((evt) => {
        // allow drop
        evt.preventDefault();
    });
    const handleDrop = useListener(async (evt) => {
        const files = _.slice(evt.dataTransfer.files);
        evt.preventDefault();
        await uploadPictures(files);
        setIsDropTarget(false);
    });
    const handleRemoveClick = useListener(async (evt) => {
        await removePictures();
        setDeletionCandidateIDs([]);
    });
    const handleImageClick = useListener((evt) => {
        let pictureID = parseInt(evt.currentTarget.getAttribute('data-picture-id'));
        selectPicture(pictureID);
    });

    render();
    const pictures = await PictureFinder.findPictures(db, purpose);
    render();

    function render() {
        show(
            <div className="image-album-dialog-box" onDragEnter={handleDragEnter}>
                {renderPictures()}
                {renderButtons()}
                {renderDropIndicator()}
            </div>
        );
    }

    function renderPictures() {
        const storedPictures = sortPictures(pictures);
        return (
            <div className="scrollable">
                {_.map(storedPictures, renderPicture)}
            </div>
        );
    }

    function renderPicture(picture, i) {
        const classNames = [ 'picture' ];
        if (managingImages) {
            if (_.includes(deletionCandidateIDs, picture.id)) {
                classNames.push('deleting');
            }
        } else {
            if (selectedPictureID) {
                if (selectedPictureID === picture.id) {
                    classNames.push('selected');
                }
            } else if (image) {
                if (image.url === picture.url) {
                    classNames.push('selected');
                }
            }
        }
        const props = {
            className: classNames.join(' '),
            onClick: handleImageClick,
            'data-picture-id': picture.id,
        };
        return (
            <div key={picture.id} { ...props}>
                <ResourceView resource={picture.details} height={120} env={env} />
            </div>
        );
    }

    function renderButtons() {
        if (managingImages) {
            const inputProps = {
                type: 'file',
                value: '',
                accept: 'image/*',
                multiple: true,
                onChange: handleUploadChange,
            };
            const removeProps = {
                className: 'remove',
                disabled: _.isEmpty(deletionCandidateIDs),
                onClick: handleRemoveClick,
            };
            const doneProps = {
                className: 'done',
                onClick: handleDoneClick,
            };
            return (
                <div key="manage" className="buttons">
                    <div className="left">
                        <PushButton {...removeProps}>{t('image-album-remove')}</PushButton>
                        {' '}
                        <label className="push-button">
                            {t('image-album-upload')}
                            <input {...inputProps} />
                        </label>
                    </div>
                    <div className="right">
                        <PushButton {...doneProps}>{t('image-album-done')}</PushButton>
                    </div>
                </div>
            );
        } else {
            const manageProps = {
                className: 'manage',
                onClick: handleManageClick,
            };
            const cancelProps = {
                className: 'cancel',
                onClick: handleCancelClick,
            };
            const selectProps = {
                className: 'select',
                disabled: !selectedPictureID,
                onClick: handleSelectClick,
            };
            return (
                <div key="select" className="buttons">
                    <div className="left">
                        <PushButton {...manageProps}>{t('image-album-manage')}</PushButton>
                    </div>
                    <div className="right">
                        <PushButton {...cancelProps}>{t('image-album-cancel')}</PushButton>
                        {' '}
                        <PushButton {...selectProps}>{t('image-album-select')}</PushButton>
                    </div>
                </div>
            );
        }
    }

    function renderDropIndicator() {
        if (!isDropTarget) {
            return null;
        }
        let props = {
            className: 'drop-target',
            onDragLeave: handleDragLeave,
            onDragOver: handleDragOver,
            onDrop: handleDrop,
        };
        return <div {...props} />;
    }

    function selectPicture(pictureID) {
        if (managingImages) {
            const newList = _.toggle(deletionCandidateIDs, pictureID);
            setDeletionCandidateIDs(newList);
        } else {
            const picture = _.find(pictures, { id: pictureID });
            if (!picture || (image && picture.url === image.url)) {
                setSelectedPictureID(0);
            } else {
                setSelectedPictureID(pictureID);
            }
        }
    }

    function getSelectedPicture() {
        return _.find(pictures, { id: selectedPictureID });
    }

    async function uploadPictures(files) {
        const currentUserID = await db.start();
        const newPictures = [];
        // create a picture object for each file, attaching payloads to them
        for (let file of files) {
            if (/^image\//.test(file.type)) {
                const payload = payloads.add('image').attachFile(file);
                const meta = await MediaLoader.getImageMetadata(file);
                newPictures.push({
                    purpose,
                    user_id: currentUserID,
                    details: {
                        payload_token: payload.id,
                        width: meta.width,
                        height: meta.height,
                        format: meta.format,
                    },
                });
            }
        }
        // save picture objects
        const savedPictures = await db.save({ table: 'picture' }, newPictures);
        for (let savedPicture of savedPictures) {
            // send the payload
            payloads.dispatch(savedPicture);
        }
    }

    async function removePictures() {
        const selectedPictures = _.filter(pictures, (picture) => {
            return _.includes(deletionCandidateIDs, picture.id);
        });
        const currentUserID = await db.start();
        const changes = _.map(selectedPictures, (picture) => {
            return { id: picture.id, deleted: true };
        });
        await db.save({ table: 'picture' }, changes);
    }
}

const sortPictures = memoizeWeak(null, function(pictures) {
    return _.orderBy(pictures, 'mtime', 'desc');
});

const component = Overlay.create(
    Relaks.memo(ImageAlbumDialogBox)
);

export {
    component as default,
    component as ImageAlbumDialogBox,
};
