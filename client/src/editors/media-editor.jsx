import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';

import Locale from 'locale/locale';
import Theme from 'theme/theme';
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
        var index = this.props.resourceIndex;
        var res = _.get(this.props.resources, index);
        if (!res) {
            var placeholder;
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
        var props = {
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
        var t = this.props.locale.translate;
        var index = this.props.resourceIndex;
        var count = _.size(this.props.resources);
        if (count === 0) {
            return null;
        }
        var removeProps = {
            label: t('media-editor-remove'),
            icon: 'remove',
            onClick: this.handleRemoveClick,
        };
        var embedProps = {
            label: t('media-editor-embed'),
            icon: 'code',
            hidden: !this.props.allowEmbedding,
            onClick: this.handleEmbedClick,
        };
        var shiftProps = {
            label: t('media-editor-shift'),
            icon: 'chevron-left',
            hidden: !this.props.allowShifting || !(count > 1),
            disabled: !(index > 0),
            onClick: this.handleShiftClick,
        };
        var directionProps = {
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
        var index = this.props.resourceIndex;
        if (index < 1) {
            return;
        }
        var resources = _.slice(this.props.resources);
        var res = resources[index];
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
        var index = this.props.resourceIndex;
        var resources = _.slice(this.props.resources);
        var res = resources[index];
        resources.splice(index, 1);
        var newIndex = index;
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
        var index = this.props.resourceIndex;
        var resource = this.props.resources[index];
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
        var index = this.props.resourceIndex;
        var resources = this.props.resources;
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
        var index = this.props.resourceIndex;
        var resources = this.props.resources;
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
        var index = this.props.resourceIndex;
        var resources = _.slice(this.props.resources);
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

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onChange: PropTypes.func.isRequired,
        onEmbed: PropTypes.func,
    };
}
