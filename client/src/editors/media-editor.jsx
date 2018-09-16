import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';

import Environment from 'env/environment';
import Payloads from 'transport/payloads';

// mixins
import UpdateCheck from 'mixins/update-check';

// widgets
import MediaButton from 'widgets/media-button';
import ImageEditor from 'editors/image-editor';
import VideoEditor from 'editors/video-editor';
import AudioEditor from 'editors/audio-editor';

import './media-editor.scss';

class MediaEditor extends PureComponent {
    static displayName = 'MediaEditor';

    /**
     * Render component
     *
     * @return {ReactELement}
     */
    render() {
        let index = this.props.resourceIndex;
        let res = _.get(this.props.resources, index);
        if (!res) {
            let placeholder;
            if (this.props.theme.mode !== 'single-col') {
                placeholder = this.props.children;
            }
            return (
                <div className="media-editor empty">
                    {placeholder}
                </div>
            );
        } else {
            return (
                <div key={index} className="media-editor">
                    <div className="resource">
                        {this.renderResource(res)}
                        {this.renderNavigation()}
                    </div>
                </div>
            );
        }
    }

    /**
     * Render editor for the given resource
     *
     * @param  {Object} res
     *
     * @return {ReactElement}
     */
    renderResource(res) {
        let props = {
            resource: res,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleResourceChange,
        };
        switch (res.type) {
            case 'image':
            case 'website':
                return <ImageEditor {...props} />;
            case 'video':
                return <VideoEditor {...props} />;
            case 'audio':
                return <AudioEditor {...props} />;
        }
    }

    /**
     * Render navigation bar for selecting resource
     *
     * @return {ReactElement}
     */
    renderNavigation() {
        let t = this.props.locale.translate;
        let index = this.props.resourceIndex;
        let count = _.size(this.props.resources);
        if (count === 0) {
            return null;
        }
        let removeProps = {
            label: t('media-editor-remove'),
            icon: 'remove',
            onClick: this.handleRemoveClick,
        };
        let embedProps = {
            label: t('media-editor-embed'),
            icon: 'code',
            hidden: !this.props.allowEmbedding,
            onClick: this.handleEmbedClick,
        };
        let shiftProps = {
            label: t('media-editor-shift'),
            icon: 'chevron-left',
            hidden: !this.props.allowShifting || !(count > 1),
            disabled: !(index > 0),
            onClick: this.handleShiftClick,
        };
        let directionProps = {
            index,
            count,
            hidden: !(count > 1),
            onBackwardClick: this.handleBackwardClick,
            onForwardClick: this.handleForwardClick,
        };
        return (
            <div className="navigation">
                <div className="left">
                    <MediaButton {...removeProps} />
                    <MediaButton {...embedProps} />
                    <MediaButton {...shiftProps} />
                </div>
                <div className="right">
                    <MediaButton.Direction {...directionProps} />
                </div>
            </div>
        );
    }

    /**
     * Call onChange handler
     *
     * @param  {Array<Object>} resources
     * @param  {Number} selection
     */
    triggerChangeEvent(resources, selection) {
        return this.props.onChange({
            type: 'change',
            target: this,
            resources,
            selection,
        });
    }

    /**
     * Call onEmbed handler
     *
     * @param  {Object} resource
     */
    triggerEmbedEvent(resource) {
        if (this.props.onEmbed) {
            this.props.onEmbed({
                type: 'embed',
                target: this,
                resource,
            });
        }
    }

    /**
     * Called when user clicks shift button
     *
     * @param  {Event} evt
     */
    handleShiftClick = (evt) => {
        let index = this.props.resourceIndex;
        if (index < 1) {
            return;
        }
        let resources = _.slice(this.props.resources);
        let res = resources[index];
        resources.splice(index, 1);
        resources.splice(index - 1, 0, res);
        this.triggerChangeEvent(resources, index - 1);
    }

    /**
     * Called when user clicks remove button
     *
     * @param  {Event} evt
     */
    handleRemoveClick = (evt) => {
        let index = this.props.resourceIndex;
        let resources = _.slice(this.props.resources);
        let res = resources[index];
        resources.splice(index, 1);
        let newIndex = index;
        if (index >= resources.length) {
            newIndex = resources.length - 1;
        }
        this.triggerChangeEvent(resources, newIndex);
        if (res && res.payload_token) {
            this.props.payloads.cancel(res.payload_token);
        }
    }

    /**
     * Called when user clicks embed button
     *
     * @param  {Event} evt
     *
     * @return {Promise}
     */
    handleEmbedClick = (evt) => {
        let index = this.props.resourceIndex;
        let resource = this.props.resources[index];
        this.triggerEmbedEvent(resource);
    }

    /**
     * Called when user clicks backward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleBackwardClick = (evt) => {
        let index = this.props.resourceIndex;
        let resources = this.props.resources;
        if (index <= 0) {
            return;
        }
        this.triggerChangeEvent(resources, index - 1);
    }

    /**
     * Called when user clicks forward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleForwardClick = (evt) => {
        let index = this.props.resourceIndex;
        let resources = this.props.resources;
        if (index >= _.size(resources) - 1) {
            return;
        }
        this.triggerChangeEvent(resources, index + 1);
    }

    /**
     * Called when a resource has been edited
     *
     * @param  {Object} evt
     */
    handleResourceChange = (evt) => {
        let index = this.props.resourceIndex;
        let resources = _.slice(this.props.resources);
        resources[index] = evt.resource;
        this.triggerChangeEvent(resources, index);
    }
}

export {
    MediaEditor as default,
    MediaEditor,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MediaEditor.propTypes = {
        allowEmbedding: PropTypes.bool,
        allowShifting: PropTypes.bool,
        resources: PropTypes.arrayOf(PropTypes.object),
        resourceIndex: PropTypes.number,

        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onChange: PropTypes.func.isRequired,
        onEmbed: PropTypes.func,
    };
}
