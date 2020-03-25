import React from 'react';
import { getUserName } from 'common/objects/utils/user-utils.js';

// widgets
import { MultipleUserNames } from '../widgets/multiple-user-names.jsx';

import './bookmark-view.scss';

/**
 * Component for rendering a frame around a bookmarked story.
 */
export function BookmarkView(props) {
  const { env, senders, currentUser, highlighting, children } = props;
  const { t, g } = env.locale;

  const classNames = [ 'bookmark-view' ];
  if (highlighting) {
    classNames.push('highlighting');
  }
  return (
    <div className={classNames.join(' ')}>
      <div className="title">
        {renderSenderNames()}
      </div>
      <div className="story">
        {children}
      </div>
    </div>
  );

  function renderSenderNames() {
    const isOwner = senders.some(usr => usr.id === currentUser.id);
    const others = senders.filter((sender) => {
      return sender.id !== currentUser.id;
    });
    let contents;
    if (isOwner) {
      const you = getUserName(currentUser, env);
      g(you, currentUser.details.gender);
      if (others.length === 0) {
        contents = t('bookmark-$you-bookmarked-it', you);
      } else if (others.length === 1) {
        const other = others[0];
        const name = getUserName(other, env);
        g(name, other.details.gender);
        contents = t('bookmark-$you-bookmarked-it-and-$name-recommends-it', you, name);
      } else {
        const props = {
          users: others,
          label: t('bookmark-$count-users', others.length),
          title: t('bookmark-recommendations'),
          env,
        };
        const popup = <MultipleUserNames key={1} {...props} />;
        contents = t('bookmark-$you-bookmarked-it-and-$others-recommends-it', you, popup, others.length);
      }
    } else {
      if (others.length === 0) {
        contents = '\u00a0';
      } else if (others.length === 1) {
        const name = getUserName(others[0], env);
        g(name, others[0].details.gender);
        contents = t('bookmark-$name-recommends-this', name);
      } else if (others.length === 2) {
        const name1 = getUserName(others[0], env);
        const name2 = getUserName(others[1], env);
        g(name1, others[0].details.gender);
        g(name2, others[1].details.gender);
        contents = t('bookmark-$name1-and-$name2-recommend-this', name1, name2);
      } else {
        const name1 = getUserName(others[0], env);
        const additional = others.slice(1);
        const props = {
          users: additional,
          label: t('bookmark-$count-other-users', additional.length),
          title: t('bookmark-recommendations'),
          env,
        };
        const popup = <MultipleUserNames key={1} {...props} />;
        g(name1, others[0].details.gender);
        contents = t('bookmark-$name1-and-$name2-recommend-this', name1, popup);
      }
    }
    return <span className="name">{contents}</span>
  }
}
