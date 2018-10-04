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
        let { reactions, currentUser } = this.props;
        return _.find(reactions, {
            type: 'like',
            user_id: _.get(currentUser, 'id'),
        });
    }

    /**
     * Return comments by current user
     *
     * @return {Array<Object>}
     */
    getCurrentUserComments() {
        let { currentUser, reactions } = this.props;
        let userID = _.get(currentUser, 'id');
        return _.filter(reactions, (reaction) => {
            if (reaction.user_id === userID) {
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
        let { env, access, addingComment, disabled } = this.props;
        let { t } = env.locale;
        let canComment = (access === 'read-comment' || access === 'read-write');
        let likeButtonProps = {
            icon: 'thumbs-up',
            label: t('story-like'),
            hidden: !canComment,
            highlighted: !!this.getCurrentUserLike(),
            disabled,
            onClick: this.handleLikeClick,
        };
        let commentButtonProps = {
            icon: 'comment',
            label: t('story-comment'),
            hidden: !canComment,
            highlighted: !_.isEmpty(this.getCurrentUserComments()) || addingComment,
            disabled,
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
        onAction: PropTypes.func,
    }
}
