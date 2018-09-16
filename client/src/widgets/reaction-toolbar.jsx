import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import HeaderButton from 'widgets/header-button';

import './reaction-toolbar.scss';

class ReactionToolbar extends PureComponent {
    static displayName = 'ReactionToolbar';

    /**
     * Return a 'like' reaction by the current user
     *
     * @return {Object|null}
     */
    getCurrentUserLike() {
        return _.find(this.props.reactions, {
            type: 'like',
            user_id: _.get(this.props.currentUser, 'id'),
        });
    }

    /**
     * Return comments by current user
     *
     * @return {Array<Object>}
     */
    getCurrentUserComments() {
        let userId = _.get(this.props.currentUser, 'id');
        return _.filter(this.props.reactions, (reaction) => {
            if (reaction.user_id === userId) {
                if (reaction.type === 'comment' || reaction.type === 'note') {
                    return true;
                }
            }
        });
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let t = this.props.locale.translate;
        let access = this.props.access;
        let canComment = (access === 'read-comment' || access === 'read-write');
        let likeButtonProps = {
            icon: 'thumbs-up',
            label: t('story-like'),
            hidden: !canComment,
            highlighted: !!this.getCurrentUserLike(),
            disabled: this.props.disabled,
            onClick: this.handleLikeClick,
        };
        let commentButtonProps = {
            icon: 'comment',
            label: t('story-comment'),
            hidden: !canComment,
            highlighted: !_.isEmpty(this.getCurrentUserComments()) || this.props.addingComment,
            disabled: this.props.disabled,
            onClick: this.handleCommentClick,
        };
        return (
            <div className="reaction-toolbar">
                <HeaderButton {...likeButtonProps} />
                <HeaderButton {...commentButtonProps} />
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
     * Called when user click on like button
     *
     * @param  {Event} evt
     */
    handleLikeClick = (evt) => {
        let like = this.getCurrentUserLike();
        if (like) {
            this.triggerActionEvent('like-remove', { like });
        } else {
            this.triggerActionEvent('like-add');
        }
    }

    /**
     * Called when user click on comment button
     *
     * @param  {Event} evt
     */
    handleCommentClick = (evt) => {
        this.triggerActionEvent('reaction-add');
    }

    /**
     * Called when user click on show button
     *
     * @param  {Event} evt
     */
    handleShowClick = (evt) => {
        this.triggerActionEvent('reaction-expand');
    }
}

export {
    ReactionToolbar as default,
    ReactionToolbar,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ReactionToolbar.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]),
        currentUser: PropTypes.object,
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        addingComment: PropTypes.bool,
        disabled: PropTypes.bool,
        env: PropTypes.instanceOf(Environment).isRequired,
        theme: PropTypes.instanceOf(Theme),
        onAction: PropTypes.func,
    }
}
