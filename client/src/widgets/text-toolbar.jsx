import React from 'react';
import { useListener } from 'relaks';

// widgets
import HeaderButton from './header-button.jsx';

import './text-toolbar.scss';

/**
 * Row of buttons for changing text type.
 */
function TextToolbar(props) {
    const { env, story, onAction } = props;
    const { t } = env.locale;

    const handleClick = useListener((evt) => {
        const type = evt.currentTarget.getAttribute('data-type');
        let action, value;
        if (type === 'markdown') {
            action = 'markdown-set';
            value = !story.details.markdown;
        } else {
            action = 'story-type-set';
            value = (story.type !== type) ? type : 'post';
        }
        if (onAction) {
            onAction({ action, value });
        }
    });

    const markdownProps = {
        label: t('story-markdown'),
        icon: 'pencil-square',
        highlighted: story.details.markdown,
        'data-type': 'markdown',
        onClick: handleClick,
    };
    const taskListProps = {
        label: t('story-task-list'),
        icon: 'list-ol',
        highlighted: (story.type === 'task-list'),
        'data-type': 'task-list',
        onClick: handleClick,
    };
    const surveyProps = {
        label: t('story-survey'),
        icon: 'list-ul',
        highlighted: (story.type === 'survey'),
        'data-type': 'survey',
        onClick: handleClick,
    };

    return (
        <div className="text-toolbar">
            <HeaderButton {...markdownProps} />
            <HeaderButton {...taskListProps} />
            <HeaderButton {...surveyProps} />
        </div>
    );
}

export {
    TextToolbar as default,
    TextToolbar,
};
