import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import * as MediaLoader from 'media/media-loader';
import * as PictureFinder from 'objects/finders/picture-finder';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import ResourceView from 'widgets/resource-view';

import './image-album-dialog-box.scss';

class ImageAlbumDialogBox extends AsyncComponent {
    static displayName = 'ImageAlbumDialogBox';

    constructor(props) {
        super(props);
        this.state = {
            shown: false
        };
    }

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, env, payloads, image, show, purpose, onSelect, onCancel } = this.props;
        let { shown } = this.state;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            pictures: null,

            show,
            purpose,
            image,
            database,
            env,
            payloads,
            onSelect,
            onCancel,
        };
        // TODO: give dialog box minimal dimension
        //meanwhile.show(<ImageAlbumDialogBoxSync {...props} />);
        return db.start().then((userID) => {
            // load pictures for given purpose if we're showing the dialog box
            if (show || shown) {
                return PictureFinder.findPictures(db, purpose).then((pictures) => {
                    props.pictures = pictures;
                });
            }
        }).then(() => {
            return <ImageAlbumDialogBoxSync {...props} />
        });
    }

    /**
     * Remember whether dialog box was shown
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        if (prevProps.show) {
            this.setState({ shown: true });
        }
    }
}

class ImageAlbumDialogBoxSync extends PureComponent {
    static displayName = 'ImageAlbumDialogBox.Sync';

    constructor(props) {
        super(props);
        this.state = {
            managingImages: false,
            selectedPictureID: null,
            deletionCandidateIDs: [],
            isDropTarget: false,
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show } = this.props;
        let overlayProps = {
            show,
            onBackgroundClick: this.handleBackgroundClick,
        };
        let dialogProps = {
            className: 'image-album-dialog-box',
            onDragEnter: this.handleDragEnter,
        };
        return (
            <Overlay {...overlayProps}>
                <div  {...dialogProps}>
                    {this.renderPictures()}
                    {this.renderButtons()}
                    {this.renderDropIndicator()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render image grid
     *
     * @return {ReactElement}
     */
    renderPictures() {
        let { pictures } = this.props;
        pictures = sortPictures(pictures);
        return (
            <div className="scrollable">
            {
                _.map(pictures, (picture) => {
                    return this.renderPicture(picture);
                })
            }
            </div>
        );
    }

    /**
     * Render a picture in the album
     *
     * @param  {Object} picture
     *
     * @return {ReactElement}
     */
    renderPicture(picture) {
        let { env, image } = this.props;
        let { managingImages, selectedPictureID, deletionCandidateIDs } = this.state;
        let props = {
            className: 'picture',
            onClick: this.handleImageClick,
            'data-picture-id': picture.id,
        };
        if (managingImages) {
            if (_.includes(deletionCandidateIDs, picture.id)) {
                props.className += ' deleting';
            }
        } else {
            if (selectedPictureID) {
                if (selectedPictureID === picture.id) {
                    props.className += ' selected';
                }
            } else if (image) {
                if (image.url === picture.url) {
                    props.className += ' selected';
                }
            }
        }
        return (
            <div key={picture.id} { ...props}>
                <ResourceView resource={picture.details} height={120} env={env} />
            </div>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env } = this.props;
        let { managingImages, selectedPictureID, deletionCandidateIDs } = this.state;
        let { t } = env.locale;
        if (managingImages) {
            let inputProps = {
                type: 'file',
                value: '',
                accept: 'image/*',
                multiple: true,
                onChange: this.handleUploadChange,
            };
            let removeProps = {
                className: 'remove',
                disabled: _.isEmpty(deletionCandidateIDs),
                onClick: this.handleRemoveClick,
            };
            let doneProps = {
                className: 'done',
                onClick: this.handleDoneClick,
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
            let manageProps = {
                className: 'manage',
                onClick: this.handleManageClick,
            };
            let cancelProps = {
                className: 'cancel',
                onClick: this.handleCancelClick,
            };
            let selectProps = {
                className: 'select',
                disabled: !selectedPictureID,
                onClick: this.handleSelectClick,
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

    /**
     * Render visual indicator when files are dragged over dialog box
     *
     * @return {ReactElement|null}
     */
    renderDropIndicator() {
        let { isDropTarget } = this.state;
        if (!isDropTarget) {
            return null;
        }
        let props = {
            className: 'drop-target',
            onDragLeave: this.handleDragLeave,
            onDragOver: this.handleDragOver,
            onDrop: this.handleDrop,
        };
        return <div {...props} />;
    }

    /**
     * Add image files to album
     *
     * @param  {Array<File>} files
     *
     * @return {Promise<Picture>}
     */
    uploadPictures(files) {
        let { database, payloads, purpose } = this.props;
        files = _.filter(files, (file) => {
            return /^image\//.test(file.type);
        });
        let db = database.use({ schema: 'global', by: this });
        return db.start().then((currentUserID) => {
            // create a picture object for each file, attaching payloads to them
            return Promise.mapSeries(files, (file, index) => {
                let payload = payloads.add('image').attachFile(file);
                return MediaLoader.getImageMetadata(file).then((meta) => {
                    return {
                        purpose,
                        user_id: currentUserID,
                        details: {
                            payload_token: payload.id,
                            width: meta.width,
                            height: meta.height,
                            format: meta.format,
                        },
                    };
                });
            }).then((pictures) => {
                // save picture objects
                return db.save({ table: 'picture' }, pictures).each((picture) => {
                    // send the payload
                    payloads.dispatch(picture);
                    return null;
                });
            });
        });
    }

    /**
     * Remove specified pictures
     *
     * @param  {Array<Number>} pictureIDs
     *
     * @return {Promise<Array>}
     */
    removePictures(pictureIDs) {
        let { database, pictures } = this.props;
        let hash = _.keyBy(pictures, 'id');
        pictures = _.filter(_.map(pictureIDs, (id) => {
            return hash[id];
        }));
        if (_.isEmpty(pictures)) {
            return;
        }
        let db = database.use({ schema: 'global', by: this });
        return db.start().then((userID) => {
            let changes = _.map(pictures, (picture) => {
                return {
                    id: picture.id,
                    deleted: true,
                };
            });
            return db.save({ table: 'picture' }, changes);
        });
    }

    /**
     * Called when user clicks on one of the images
     *
     * @param  {Event} evt
     */
    handleImageClick = (evt) => {
        let { pictures, image } = this.props;
        let { managingImages, deletionCandidateIDs } = this.state;
        let pictureID = parseInt(evt.currentTarget.getAttribute('data-picture-id'));
        if (managingImages) {
            if (_.includes(deletionCandidateIDs, pictureID)) {
                deletionCandidateIDs = _.without(deletionCandidateIDs, pictureID);
            } else {
                deletionCandidateIDs = _.concat(deletionCandidateIDs, pictureID);
            }
            this.setState({ deletionCandidateIDs });
        } else {
            let selectedPictureID = pictureID;
            let picture = _.find(pictures, { id: pictureID });
            if (image) {
                if (picture.url === image.url) {
                    selectedPictureID = null;
                }
            }
            this.setState({ selectedPictureID });
        }
    }

    /**
     * Called when user clicks manage button
     *
     * @param  {Event} evt
     */
    handleManageClick = (evt) => {
        this.setState({ managingImages: true });
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleDoneClick = (evt) => {
        this.setState({
            managingImages: false,
            deletionCandidateIDs: []
        });
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        let { onCancel } = this.props;
        if (onCancel) {
            onCancel({
                type: 'cancel',
                target: this,
            });
        }
    }

    /**
     * Called when user clicks select button
     *
     * @param  {Event} evt
     */
    handleSelectClick = (evt) => {
        let { pictures, onSelect } = this.props;
        let { selectedPictureID } = this.state;
        if (onSelect) {
            let selectedPicture = _.find(pictures, { id: selectedPictureID });
            onSelect({
                type: 'select',
                target: this,
                image: selectedPicture.details
            });
        }
    }

    /**
     * Called when user clicks outside the dialog box
     *
     * @param  {Event} evt
     */
    handleBackgroundClick = (evt) => {
        let { onCancel } = this.props;
        if (onCancel) {
            onCancel({
                type: 'cancel',
                target: this,
            });
        }
    }

    /**
     * Called after user has selected some files
     *
     * @param  {Event} evt
     */
    handleUploadChange = (evt) => {
        let files = evt.target.files;
        if (files.length) {
            return this.uploadPictures(files);
        }
    }

    /**
     * Called when dragged file(s) enters dialog box
     *
     * @param  {Event} evt
     */
    handleDragEnter = (evt) => {
        this.setState({ isDropTarget: true });
    }

    /**
     * Called when drag files are no longer over dialog box
     *
     * @param  {Event} evt
     */
    handleDragLeave = (evt) => {
        this.setState({ isDropTarget: false });
    }

    /**
     * Called when user is dragging file(s) over dialog box
     *
     * @param  {Event} evt
     */
    handleDragOver = (evt) => {
        // allow drop
        evt.preventDefault();
    }

    /**
     * Called when user drop file(s) onto dialog box
     *
     * @param  {Event} evt
     */
    handleDrop = (evt) => {
        let { files } = evt.dataTransfer;
        evt.preventDefault();
        if (files.length > 0) {
            this.uploadPictures(files);
        }
        this.setState({ isDropTarget: false });
    }

    /**
     * Called when user clicks remove
     *
     * @param  {Event} evt
     */
    handleRemoveClick = (evt) => {
        let { deletionCandidateIDs } = this.state;
        this.setState({ deletionCandidateIDs: [] }, () => {
            this.removePictures(deletionCandidateIDs);
        });
    }
}

let sortPictures = memoizeWeak(null, function(pictures) {
    return _.orderBy(pictures, 'mtime', 'desc');
});

export {
    ImageAlbumDialogBox as default,
    ImageAlbumDialogBox,
    ImageAlbumDialogBoxSync,
};

import Database from 'data/database';
import Environment from 'env/environment';
import Payloads from 'transport/payloads';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ImageAlbumDialogBox.propTypes = {
        show: PropTypes.bool,
        purpose: PropTypes.string.isRequired,
        image: PropTypes.object,
        database: PropTypes.instanceOf(Database).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        onSelect: PropTypes.func,
        onCancel: PropTypes.func,
    };
    ImageAlbumDialogBoxSync.propTypes = {
        pictures: PropTypes.arrayOf(PropTypes.object),

        show: PropTypes.bool,
        purpose: PropTypes.string.isRequired,
        image: PropTypes.object,
        database: PropTypes.instanceOf(Database).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        onSelect: PropTypes.func,
        onCancel: PropTypes.func,
    };
}
