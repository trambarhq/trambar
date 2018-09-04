import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import HeaderButton from 'widgets/header-button';

import './text-toolbar.scss';

class TextToolbar extends PureComponent {
    static displayName = 'TextToolbar';

    render() {
        var t = this.props.locale.translate;
        var story = this.props.story;
        var markdownProps = {
            label: t('story-markdown'),
            icon: 'pencil-square',
            highlighted: story.details.markdown,
            onClick: this.handleMarkdownClick,
        };
        var taskListProps = {
            label: t('story-task-list'),
            icon: 'list-ol',
            highlighted: (story.type === 'task-list'),
            onClick: this.handleTaskListClick,
        };
        var surveyProps = {
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
        if (this.props.onAction) {
            this.props.onAction(_.extend({
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
        var story = this.props.story;
        var value = !story.details.markdown;
        this.triggerActionEvent('markdown-set', { value });
    }

    /**
     * Called when user clicks task-list button
     *
     * @param  {Event} evt
     */
    handleTaskListClick = (evt) => {
        var story = this.props.story;
        var value = (story.type !== 'task-list') ? 'task-list' : 'post';
        this.triggerActionEvent('story-type-set', { value });
    }

    /**
     * Called when user clicks survey button
     *
     * @param  {Event} evt
     */
    handleSurveyClick = (evt) => {
        var story = this.props.story;
        var value = (story.type !== 'survey') ? 'survey' : 'post';
        this.triggerActionEvent('story-type-set', { value });
    }
}

export {
    TextToolbar as default,
    TextToolbar,
};

import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    TextToolbar.propTypes = {
        story: PropTypes.object.isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onAction: PropTypes.func,
    };
}
