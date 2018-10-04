import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';

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
        let { env, resources, resourceIndex, children } = this.props;
        let resource = _.get(resources, resourceIndex);
        if (!resource) {
            let placeholder;
            if (env.isWiderThan('double-col')) {
                placeholder = children;
            }
            return (
                <div className="media-editor empty">
                    {placeholder}
                </div>
            );
        } else {
            return (
                <div key={resourceIndex} className="media-editor">
                    <div className="resource">
                        {this.renderResource(resource)}
                        {this.renderNavigation()}
                    </div>
                </div>
            );
        }
    }

    /**
     * Render editor for the given resource
     *
     * @param  {Object} resource
     *
     * @return {ReactElement}
     */
    renderResource(resource) {
        let { payloads, env } = this.props;
        let props = {
            resource,
            payloads,
            env,
            onChange: this.handleResourceChange,
        };
        switch (resource.type) {
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
        let {
            env,
            resources,
            resourceIndex,
            allowEmbedding,
            allowShifting,
        } = this.props;
        let { t } = env.locale;
        let resourceCount = _.size(resources);
        if (resourceCount === 0) {
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
            hidden: !allowEmbedding,
            onClick: this.handleEmbedClick,
        };
        let shiftProps = {
            label: t('media-editor-shift'),
            icon: 'chevron-left',
            hidden: !allowShifting || !(resourceCount > 1),
            disabled: !(resourceIndex > 0),
            onClick: this.handleShiftClick,
        };
        let directionProps = {
            index: resourceIndex,
            count: resourceCount,
            hidden: !(resourceCount > 1),
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
        let { onChange } = this.props;
        if (onChange) {
            return onChange({
                type: 'change',
                target: this,
                resources,
                selection,
            });
        }
    }

    /**
     * Call onEmbed handler
     *
     * @param  {Object} resource
     */
    triggerEmbedEvent(resource) {
        let { onEmbed } = this.props;
        if (onEmbed) {
            onEmbed({
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
        let { resources, resourceIndex } = this.props;
        if (resourceIndex < 1) {
            return;
        }
        let res = resources[resourceIndex];
        resources = _.slice(resources);
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
        let { payloads, resources, resourceIndex } = this.props;
        let res = resources[resourceIndex];
        resources = _.slice(resources);
        resources.splice(resourceIndex, 1);
        let newIndex = resourceIndex;
        if (resourceIndex >= resources.length) {
            newIndex = resources.length - 1;
        }
        this.triggerChangeEvent(resources, newIndex);
        if (res && res.payload_token) {
            payloads.cancel(res.payload_token);
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
        let { resources, resourceIndex } = this.props;
        let res = resources[resourceIndex];
        this.triggerEmbedEvent(res);
    }

    /**
     * Called when user clicks backward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleBackwardClick = (evt) => {
        let { resources, resourceIndex } = this.props;
        if (resourceIndex <= 0) {
            return;
        }
        this.triggerChangeEvent(resources, resourceIndex - 1);
    }

    /**
     * Called when user clicks forward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleForwardClick = (evt) => {
        let { resources, resourceIndex } = this.props;
        if (resourceIndex >= _.size(resources) - 1) {
            return;
        }
        this.triggerChangeEvent(resources, resourceIndex + 1);
    }

    /**
     * Called when a resource has been edited
     *
     * @param  {Object} evt
     */
    handleResourceChange = (evt) => {
        let { resources, resourceIndex } = this.props;
        resources = _.slice(resources);
        resources[resourceIndex] = evt.resource;
        this.triggerChangeEvent(resources, resourceIndex);
    }
}

export {
    MediaEditor as default,
    MediaEditor,
};

import Environment from 'env/environment';
import Payloads from 'transport/payloads';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MediaEditor.propTypes = {
        allowEmbedding: PropTypes.bool,
        allowShifting: PropTypes.bool,
        resources: PropTypes.arrayOf(PropTypes.object),
        resourceIndex: PropTypes.number,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onChange: PropTypes.func.isRequired,
        onEmbed: PropTypes.func,
    };
}
