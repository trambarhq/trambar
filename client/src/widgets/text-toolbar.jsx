import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import HeaderButton from 'widgets/header-button';

import './text-toolbar.scss';

/**
 * Row of buttons for changing text type.
 *
 * @extends PureComponent
 */
class TextToolbar extends PureComponent {
    static displayName = 'TextToolbar';

    render() {
        let { env, story } = this.props;
        let { t } = env.locale;
        let markdownProps = {
            label: t('story-markdown'),
            icon: 'pencil-square',
            highlighted: story.details.markdown,
            onClick: this.handleMarkdownClick,
        };
        let taskListProps = {
            label: t('story-task-list'),
            icon: 'list-ol',
            highlighted: (story.type === 'task-list'),
            onClick: this.handleTaskListClick,
        };
        let surveyProps = {
            label: t('story-survey'),
            icon: 'list-ul',
            highlighted: (story.type === 'survey'),
            onClick: this.handleSurveyClick,
        };
        return (
            <div className="text-toolbar">
                <HeaderButton {...markdownProps} />
                <HeaderButton {...taskListProps} />
                <HeaderButton {...surveyProps} />
            </div>
        );
    }

    /**
     * Inform parent component that certain action should occur
     *
     * @param  {String} action
     * @param  {Object|undefined} props
     */
    triggerActionEvent(action, props) {
        let { onAction } = this.props;
        if (onAction) {
            onAction(_.extend({
                type: 'action',
                target: this,
                action,
            }, props));
        }
    }

    /**
     * Called when user clicks markdown button
     *
     * @param  {Event} evt
     */
    handleMarkdownClick = (evt) => {
        let { story } = this.props;
        let value = !story.details.markdown;
        this.triggerActionEvent('markdown-set', { value });
    }

    /**
     * Called when user clicks task-list button
     *
     * @param  {Event} evt
     */
    handleTaskListClick = (evt) => {
        let { story } = this.props;
        let value = (story.type !== 'task-list') ? 'task-list' : 'post';
        this.triggerActionEvent('story-type-set', { value });
    }

    /**
     * Called when user clicks survey button
     *
     * @param  {Event} evt
     */
    handleSurveyClick = (evt) => {
        let { story } = this.props;
        let value = (story.type !== 'survey') ? 'survey' : 'post';
        this.triggerActionEvent('story-type-set', { value });
    }
}

export {
    TextToolbar as default,
    TextToolbar,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    TextToolbar.propTypes = {
        story: PropTypes.object.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        onAction: PropTypes.func,
    };
}
