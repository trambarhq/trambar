import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';
import * as FocusManager from 'utils/focus-manager';
import * as DeviceManager from 'media/device-manager';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import PushButton from 'widgets/push-button';
import ImageEditor from 'editors/image-editor';
import MediaImporter from 'editors/media-importer';
import PhotoCaptureDialogBox from 'dialogs/photo-capture-dialog-box';
import Icon from 'octicons/build/svg/person.svg';

import './user-image-panel.scss';

class UserImagePanel extends PureComponent {
    static displayName = 'UserImagePanel';

    constructor(props) {
        super(props);

        this.components = ComponentRefs({
            importer: MediaImporter
        });
        this.state = {
            action: null,
            image: null,
            hasCamera: DeviceManager.hasDevice('videoinput'),
        };
    }

    /**
     * Return a property of the user object
     *
     * @param  {String} path
     *
     * @return {*}
     */
    getUserProperty(path) {
        return _.get(this.props.currentUser, path);
    }

    /**
     * Return either the pending image or existing
     *
     * @return {[type]}
     */
    getImage() {
        if (this.state.image) {
            return this.state.image;
        } else {
            let resources = this.getUserProperty('details.resources');
            return _.find(resources, { type: 'image' });
        }
    }

    /**
     * Change a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty(path, value) {
        if (!this.props.currentUser) {
            return;
        }
        let userAfter = _.decoupleSet(this.props.currentUser, path, value);
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                user: userAfter,
                immediate: true
            });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let t = this.props.locale.translate;
        return (
            <SettingsPanel className="user-image">
                <header>
                    <i className="fa fa-image" /> {t('settings-profile-image')}
                </header>
                <body>
                    {this.renderProfilePicture()}
                    {this.renderMediaImporter()}
                </body>
                <footer>
                    {this.renderButtons()}
                </footer>
            </SettingsPanel>
        );
    }

    /**
     * Render either an image cropper or a placeholder
     *
     * @return {ReactElement}
     */
    renderProfilePicture() {
        let contents;
        let image = this.getImage();
        if (image) {
            let props = {
                resource: image,
                locale: this.props.locale,
                theme: this.props.theme,
                previewWidth: 256,
                previewHeight: 256,
                disabled: (this.state.action !== 'adjust'),
                onChange: this.handleImageChange,

            };
            contents = <ImageEditor {...props} />;
        } else {
            contents = (
                <div className="no-image">
                    <Icon className="" />
                </div>
            );
        }
        return <div className="image-container">{contents}</div>;
    }

    /**
     * Render media importer
     *
     * @return {ReactElement}
     */
    renderMediaImporter() {
        let setters = this.components.setters;
        let resources;
        if (this.state.image) {
            resources = [ this.state.image ];
        } else {
            resources = _.get(this.props.currentUser, 'details.resources', []);
        }
        let props = {
            ref: setters.importer,
            types: [ 'image' ],
            limit: 1,
            schema: 'global',
            resources: resources,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads.override({ schema: 'global' }),
            cameraDirection: 'front',
            onChange: this.handleChange,
            onCaptureEnd: this.handleCaptureEnd,
        };
        return <MediaImporter {...props} />
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let t = this.props.locale.translate;
        let hasPicture = !!this.getImage();
        if (this.state.action === 'adjust' && hasPicture) {
            let cancelProps = {
                label: t('user-image-cancel'),
                onClick: this.handleCancelClick,
            };
            let saveProps = {
                label: t('user-image-save'),
                emphasized: true,
                disabled: !this.state.image,
                onClick: this.handleSaveClick,
            }
            return (
                <div key="adjust" className="buttons">
                    <PushButton {...cancelProps} />
                    <PushButton {...saveProps} />
                </div>
            );
        } else if (this.state.action === 'replace' && hasPicture) {
            let cancelProps = {
                label: t('user-image-cancel'),
                onClick: this.handleCancelClick,
            };
            let takeProps = {
                label: t('user-image-snap'),
                hidden: !PhotoCaptureDialogBox.isAvailable() || !this.state.hasCamera,
                onClick: this.handleTakeClick,
            };
            let selectProps = {
                label: t('user-image-select'),
                accept: 'image/*',
                onChange: this.handleFileChange,
            };
            return (
                <div key="replace" className="buttons">
                    <PushButton {...cancelProps} />
                    <PushButton {...takeProps} />
                    <PushButton.File {...selectProps} />
                </div>
            );
        } else if (hasPicture) {
            let adjustProps = {
                label: t('user-image-adjust'),
                onClick: this.handleAdjustClick,
            };
            let replaceProps = {
                label: t('user-image-replace'),
                onClick: this.handleReplaceClick,
            };
            return (
                <div key="action" className="buttons">
                    <PushButton {...adjustProps} />
                    <PushButton {...replaceProps} />
                </div>
            );
        } else {
            let takeProps = {
                label: t('user-image-snap'),
                hidden: !PhotoCaptureDialogBox.isAvailable() || !this.state.hasCamera,
                onClick: this.handleTakeClick,
            };
            let selectProps = {
                label: t('user-image-select'),
                accept: 'image/*',
                onChange: this.handleFileChange,
            };
            return (
                <div key="add" className="buttons">
                    <PushButton {...takeProps} />
                    <PushButton.File {...selectProps} />
                </div>
            );
        }
    }

    /**
     * Add event listener on mount
     */
    componentDidMount() {
        DeviceManager.addEventListener('change', this.handleDeviceChange);
    }

    /**
     * Remove handlers on unmount
     */
    componentWillUnmount() {
        DeviceManager.removeEventListener('change', this.handleDeviceChange);
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        this.setState({ action: null, image: null })
    }

    /**
     * Called when user clicks adjust button
     *
     * @param  {Event} evt
     */
    handleAdjustClick = (evt) => {
        this.setState({ action: 'adjust' });
    }

    /**
     * Called when user clicks adjust button
     *
     * @param  {Event} evt
     */
    handleReplaceClick = (evt) => {
        this.setState({ action: 'replace' });
    }

    /**
     * Called when user clicks take picture button
     *
     * @param  {Event} evt
     */
    handleTakeClick = (evt) => {
        this.components.importer.capture('image');
    }

    /**
     * Called when a file is selected
     *
     * @param  {Event} evt
     */
    handleFileChange = (evt) => {
        let files = evt.target.files;
        this.components.importer.importFiles(files);
    }

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick = (evt) => {
        if (this.state.image) {
            this.setUserProperty('details.resources', [ this.state.image ]);
            this.setState({ action: null, image: null });
        }
    }

    /**
     * Called when cropping rectangle changes
     *
     * @param  {Object} evt
     */
    handleImageChange = (evt) => {
        this.setState({ image: evt.resource });
    }

    /**
     * Called when MediaImporter has imported or captured an image
     *
     * @param  {Object} evt
     *
     * @return {Promise}
     */
    handleChange = (evt) => {
        this.setState({ image: evt.resources[0], action: 'adjust' });
        return Promise.resolve();
    }

    /**
     * Called when image capturing has ended
     *
     * @param  {Object} evt
     */
    handleCaptureEnd = (evt) => {
    }

    /**
     * Called when the list of media devices changes
     *
     * @param  {Object} evt
     */
    handleDeviceChange = (evt) => {
        this.setState({
            hasCamera: DeviceManager.hasDevice('videoinput'),
        });
    }
}

export {
    UserImagePanel as default,
    UserImagePanel,
};

import Payloads from 'transport/payloads';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserImagePanel.propTypes = {
        currentUser: PropTypes.object,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        onChange: PropTypes.func,
    };
}
