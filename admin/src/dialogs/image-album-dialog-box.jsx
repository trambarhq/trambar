var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var MediaLoader = require('media/media-loader');
var ImageView = require('media/image-view');

var Database = require('data/database');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./image-album-dialog-box.scss');

module.exports = Relaks.createClass({
    displayName: 'ImageAlbumDialogBox',
    propTypes: {
        show: PropTypes.bool,
        purpose: PropTypes.string.isRequired,
        image: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onSelect: PropTypes.func,
        onCancel: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            shown: false
        };
    },

    /**
     * Remember whether dialog box was shown
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (nextProps.show) {
            this.setState({ shown: true });
        }
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            pictures: null,

            show: this.props.show,
            purpose: this.props.purpose,
            image: this.props.image,
            database: this.props.database,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onSelect: this.props.onSelect,
            onCancel: this.props.onCancel,
        };
        //meanwhile.show(<ImageAlbumDialogBoxSync {...props} />);
        return db.start().then((currentUserId) => {
            // load pictures for given purpose if we're showing the dialog box
            if (this.props.show || this.state.shown) {
                var criteria = {
                    purpose: this.props.purpose
                };
                return db.find({ table: 'picture', criteria });
            }
        }).then((pictures) => {
            props.pictures = pictures;
            return <ImageAlbumDialogBoxSync {...props} />
        });
    },

});

var ImageAlbumDialogBoxSync = module.exports.Sync = React.createClass({
    displayName: 'ImageAlbumDialogBox.Sync',
    propTypes: {
        show: PropTypes.bool,
        projects: PropTypes.arrayOf(PropTypes.object),
        purpose: PropTypes.string.isRequired,
        image: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onSelect: PropTypes.func,
        onCancel: PropTypes.func,
    },

    getInitialState: function() {
        return {
            managingImages: false,
            selectedPictureId: null,
            deletionCandidateIds: [],
            isDropTarget: false,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleBackgroundClick,
        };
        var dialogProps = {
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
    },

    /**
     * Render image grid
     *
     * @return {ReactElement}
     */
    renderPictures: function() {
        var pictures = sortPictures(this.props.pictures);
        return (
            <div className="scrollable">
                {_.map(pictures, this.renderPicture)}
            </div>
        );
    },

    /**
     * Render a picture in the album
     *
     * @param  {Object} picture
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderPicture: function(picture, i) {
        var image = picture.details;
        var props = {
            key: i,
            className: 'picture',
            onClick: this.handleImageClick,
            'data-picture-id': picture.id,
        };
        var selected = false;
        if (this.state.managingImages) {
            if (_.includes(this.state.deletionCandidateIds, picture.id)) {
                props.className += ' deleting';
            }
        } else {
            if (this.state.selectedPictureId) {
                if (this.state.selectedPictureId === picture.id) {
                    props.className += ' selected';
                }
            } else if (this.props.image) {
                if (this.props.image.url === picture.url) {
                    props.className += ' selected';
                }
            }
        }
        var height = 120;
        var width = Math.round(image.width * height / image.height);
        var style = { height, width };
        if (image.url) {
            var url = this.props.theme.getImageUrl(image, { height, width });
            return (
                <div {...props}>
                    <img src={url} style={style} />
                </div>
            );
        } else if (image.file) {
            var imageUrl = URL.createObjectURL(image.file);
            props.className += ' disabled';
            props.onClick = null;
            return (
                <div {...props}>
                    <ImageView url={imageUrl} style={style} />
                </div>
            );
        }
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        if (this.state.managingImages) {
            var inputProps = {
                type: 'file',
                value: '',
                accept: 'image/*',
                multiple: true,
                onChange: this.handleUploadChange,
            };
            var cancelProps = {
                className: 'cancel',
                onClick: this.handleCancelClick,
            };
            var removeProps = {
                className: 'remove',
                disabled: _.isEmpty(this.state.deletionCandidateIds),
                onClick: this.handleRemoveClick,
            };
            return (
                <div key="manage" className="buttons">
                    <div className="left">
                        <label className="push-button">
                            {t('image-album-upload')}
                            <input {...inputProps} />
                        </label>
                    </div>
                    <div className="right">
                        <PushButton {...cancelProps}>{t('image-album-cancel')}</PushButton>
                        {' '}
                        <PushButton {...removeProps}>{t('image-album-remove')}</PushButton>
                    </div>
                </div>
            );

        } else {
            var manageProps = {
                className: 'manage',
                onClick: this.handleManageClick,
            };
            var cancelProps = {
                className: 'cancel',
                onClick: this.handleCancelClick,
            };
            var selectProps = {
                className: 'select',
                disabled: !this.state.selectedPictureId,
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
    },

    /**
     * Render visual indicator when files are dragged over dialog box
     *
     * @return {ReactElement|null}
     */
    renderDropIndicator: function() {
        if (!this.state.isDropTarget) {
            return null;
        }
        var props = {
            className: 'drop-target',
            onDragLeave: this.handleDragLeave,
            onDragOver: this.handleDragOver,
            onDrop: this.handleDrop,
        };
        return <div {...props} />;
    },

    /**
     * Add image files to album
     *
     * @param  {Array<File>} files
     *
     * @return {Promise<Picture>}
     */
    uploadPictures: function(files) {
        files = _.filter(files, (file) => {
            return /^image\//.test(file.type);
        });
        var db = this.props.database.use({ schema: 'global', by: this });
        var payloads = this.props.payloads;
        return db.start().then((currentUserId) => {
            var urls = [];
            return Promise.mapSeries(files, (file, index) => {
                var url = urls[index] = URL.createObjectURL(file);
                return MediaLoader.loadImage(url).then((img) => {
                    var res = {
                        format: _.last(_.split(file.type, '/')),
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        file: file,
                        type: 'image',
                    };
                    return payloads.queue(res).then((payloadId) => {
                        res.payload_id = payloadId;
                        return {
                            purpose: this.props.purpose,
                            user_id: currentUserId,
                            details: _.omit(res, 'type'),
                        };
                    });
                });
            }).then((pictures) => {
                return db.save({ table: 'picture' }, pictures).mapSeries((picture) => {
                    // reattach blob
                    var payloadId = picture.details.payload_id;
                    var criteria = { payload_id: payloadId };
                    var payload = payloads.find(criteria);
                    picture.details.file = payload.file;
                    // send the file
                    payloads.send(payloadId);
                    return picture;
                });
            }).finally(() => {
                _.each(urls, (url) => {
                    URL.revokeObjectURL(url);
                });
            });
        });
    },

    /**
     * Remove specified pictures
     *
     * @param  {Array<Number>} pictureIds
     *
     * @return {Promise<Array>}
     */
    removePictures: function(pictureIds) {
        var hash = _.keyBy(this.props.pictures, 'id');
        var pictures = _.filter(_.map(pictureIds, (id) => {
            return hash[id];
        }));
        if (_.isEmpty(pictures)) {
            return;
        }
        var db = this.props.database.use({ schema: 'global', by: this });
        return db.start().then((currentUserId) => {
            return db.remove({ table: 'picture' }, pictures);
        });
    },

    /**
     * Called when user clicks on one of the images
     *
     * @param  {Event} evt
     */
    handleImageClick: function(evt) {
        var pictureId = parseInt(evt.currentTarget.getAttribute('data-picture-id'));
        if (this.state.managingImages) {
            var deletionCandidateIds = _.slice(this.state.deletionCandidateIds);
            if (_.includes(this.state.deletionCandidateIds, pictureId)) {
                _.pull(deletionCandidateIds, pictureId);
            } else {
                deletionCandidateIds.push(pictureId);
            }
            this.setState({ deletionCandidateIds });
        } else {
            var selectedPictureId = pictureId;
            var picture = _.find(this.props.pictures, { id: pictureId });
            if (this.props.image) {
                if (picture.url === this.props.image.url) {
                    selectedPictureId = null;
                }
            }
            this.setState({ selectedPictureId });
        }
    },

    /**
     * Called when user clicks manage button
     *
     * @param  {Event} evt
     */
    handleManageClick: function(evt) {
        this.setState({ managingImages: true });
    },

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        if (this.state.managingImages) {
            this.setState({
                managingImages: false,
                deletionCandidateIds: []
            });
        } else {
            if (this.props.onCancel) {
                this.props.onCancel({
                    type: 'cancel',
                    target: this,
                });
            }
        }
    },

    /**
     * Called when user clicks select button
     *
     * @param  {Event} evt
     */
    handleSelectClick: function(evt) {
        if (this.props.onSelect) {
            var id = this.state.selectedPictureId;
            var selectedPicture = _.find(this.props.pictures, { id });
            this.props.onSelect({
                type: 'select',
                target: this,
                image: selectedPicture.details
            });
        }
    },

    /**
     * Called when user clicks outside the dialog box
     *
     * @param  {Event} evt
     */
    handleBackgroundClick: function(evt) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
    },

    /**
     * Called after user has selected some files
     *
     * @param  {Event} evt
     */
    handleUploadChange: function(evt) {
        var files = evt.target.files;
        if (files.length) {
            return this.uploadPictures(files);
        }
    },

    /**
     * Called when dragged file(s) enters dialog box
     *
     * @param  {Event} evt
     */
    handleDragEnter: function(evt) {
        this.setState({ isDropTarget: true });
    },

    /**
     * Called when drag files are no longer over dialog box
     *
     * @param  {Event} evt
     */
    handleDragLeave: function(evt) {
        this.setState({ isDropTarget: false });
    },

    /**
     * Called when user is dragging file(s) over dialog box
     *
     * @param  {Event} evt
     */
    handleDragOver: function(evt) {
        // allow drop
        evt.preventDefault();
    },

    /**
     * Called when user drop file(s) onto dialog box
     *
     * @param  {Event} evt
     */
    handleDrop: function(evt) {
        evt.preventDefault();
        var files = evt.dataTransfer.files;
        var items = evt.dataTransfer.items;
        if (files.length > 0) {
            this.uploadPictures(files);
        }
        this.setState({ isDropTarget: false });
    },

    /**
     * Called when user clicks remove
     *
     * @param  {Event} evt
     */
    handleRemoveClick: function(evt) {
        var pictureIds = this.state.deletionCandidateIds;
        this.setState({ deletionCandidateIds: [] }, () => {
            this.removePictures(pictureIds);
        });
    }
});

var sortPictures = Memoize(function(pictures) {
    return _.orderBy(pictures, 'mtime', 'desc');
});
