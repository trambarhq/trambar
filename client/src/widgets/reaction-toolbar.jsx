import _ from 'lodash';
import React from 'react';
import { useListener } from 'relaks';

// widgets
import { HeaderButton } from './header-button.jsx';

import './reaction-toolbar.scss';

/**
 * Buttons for liking or commenting on a story.
 */
function ReactionToolbar(props) {
  const { env, access, reactions, currentUser, addingComment, disabled, onAction } = props;
  const { t } = env.locale;
  const canComment = (access === 'read-comment' || access === 'read-write');
  const userID = currentUser?.id;
  const userLike =  _.find(reactions, { type: 'like', user_id: userID });
  const userComments = _.filter(reactions, (reaction) => {
    if (reaction.user_id === userID) {
      if (reaction.type === 'comment' || reaction.type === 'note') {
        return true;
      }
    }
  });

  const handleLikeClick = useListener((evt) => {
    if (onAction) {
      if (userLike) {
        onAction({ action: 'like-remove', like: userLike });
      } else {
        onAction({ action: 'like-add',  });
      }
    }
  });
  const handleCommentClick = useListener((evt) => {
    if (onAction) {
      onAction({ action: 'reaction-add' });
    }
  });

  const likeButtonProps = {
    icon: 'thumbs-up',
    label: t('story-like'),
    hidden: !canComment,
    highlighted: !!userLike,
    disabled,
    onClick: handleLikeClick,
  };
  const commentButtonProps = {
    icon: 'comment',
    label: t('story-comment'),
    hidden: !canComment,
    highlighted: !_.isEmpty(userComments) || addingComment,
    disabled,
    onClick: handleCommentClick,
  };
  return (
    <div className="reaction-toolbar">
      <HeaderButton {...likeButtonProps} />
      <HeaderButton {...commentButtonProps} />
    </div>
  );
}

export {
  ReactionToolbar as default,
  ReactionToolbar,
};
