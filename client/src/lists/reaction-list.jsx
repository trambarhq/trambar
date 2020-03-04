import _ from 'lodash';
import React, { useState } from 'react';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import Merger from 'common/data/merger.mjs';

// widgets
import { ReactionView } from '../views/reaction-view.jsx';
import { ReactionEditor } from '../editors/reaction-editor.jsx';
import { SmartList } from 'common/widgets/smart-list.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './reaction-list.scss';

export function ReactionList(props) {
  const { database, payloads, route, env } = props;
  const { access, story, reactions, respondents, repo, currentUser } = props;
  const { highlightReactionID, scrollToReactionID } = props;
  const { onFinish } = props;
  const [ hiddenReactionIDs, setHiddenReactionIDs ] = useState([]);

  const handleReactionIdentity = (evt) => {
    if (evt.alternative) {
      const location = { table: 'reaction' };
      const tempID = database.findTemporaryID(location, evt.item.id);
      return getAnchor(tempID);
    } else {
      return getAnchor(evt.item.id);
    }
  };
  const handleReactionTransition = (evt) => {
    // don't transition in comment editor with a temporary object
    return (evt.item.id >= 1);
  };
  const handleReactionRender = (evt) => {
    return renderReaction(evt.item);
  };
  const handleReactionBeforeAnchor = (evt) => {
    setHiddenReactionIDs(_.map(evt.items, 'id'));
  };

  const smartListProps = {
    items: sortReactions(reactions, currentUser),
    behind: 5,
    ahead: 10,
    anchor: getAnchor(scrollToReactionID || highlightReactionID),
    offset: 4,
    inverted: true,
    fresh: false,
    noReset: true,

    onIdentity: handleReactionIdentity,
    onTransition: handleReactionTransition,
    onRender: handleReactionRender,
    onBeforeAnchor: handleReactionBeforeAnchor,
  }
  return (
    <div className="reaction-list">
      <SmartList {...smartListProps} />
    </div>
  );

  function renderReaction(reaction) {
    let isUserDraft = false;
    let isNewComment = false;
    let highlighting = false;
    if (!reaction) {
      isUserDraft = true;
      isNewComment = true;
    } else {
      if (!reaction.published) {
        if (reaction.user_id === currentUser.id) {
          isUserDraft = true;
          if (!reaction.ptime) {
            isNewComment = true;
          }
        }
      }
      if (reaction.id === highlightReactionID) {
        highlighting = true;
      }
    }
    if (isUserDraft) {
      // always use 0 as the key for new comment by current user, so
      // the keyboard focus isn't taken away when autosave occurs
      // (and the comment gains an id)
      const key = (isNewComment) ? 0 : reaction.id;
      const props = {
        reaction,
        story,
        currentUser,
        database,
        payloads,
        route,
        env,
        onFinish,
      };
      return (
        <ErrorBoundary env={env}>
          <ReactionEditor key={key} {...props} />
        </ErrorBoundary>
      );
    } else {
      const props = {
        access,
        highlighting,
        reaction,
        respondent: findRespondent(respondents, reaction),
        story,
        repo,
        currentUser,
        database,
        route,
        env,
      };
      return (
        <ErrorBoundary env={env}>
          <ReactionView key={reaction.id} {...props} />
        </ErrorBoundary>
      );
    }
  }

  function getAnchor(reactionID) {
    return (reactionID) ? `reaction-${reactionID}` : undefined
  }
}

const sortReactions = memoizeWeak(null, function(reactions, currentUser) {
  // reactions are positioned from bottom up
  // place reactions with later ptime at towards the front of the list
  const sortedReactions = _.orderBy(reactions, [ 'ptime', 'id' ], [ 'desc', 'desc' ]);
  const ownUnpublished = _.remove(sortedReactions, { user_id: currentUser, ptime: null });
  // move unpublished comment of current user to beginning, so it shows up
  // at the bottom
  _.each(ownUnpublished, (reaction) => {
    sortedReactions.unshift(reaction);
  });
  return sortedReactions;
});

const findRespondent = memoizeWeak(null, function(users, reaction) {
  if (reaction) {
    return _.find(users, { id: reaction.user_id });
  }
});
