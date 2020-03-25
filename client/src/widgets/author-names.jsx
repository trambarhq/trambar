import React from 'react';
import { getUserName } from 'common/objects/utils/user-utils.js';

// widgets
import { MultipleUserNames } from './multiple-user-names.jsx';

import './author-names.scss';

/**
 * Stateless component that displays the names of a story's author and
 * co-authors. When more there are more than two names, only the first
 * will appear while the rests are given in a pop-up (MultipleUserNames).
 */
export function AuthorNames(props) {
  const { env, authors, robot } = props;
  const { t } = env.locale;
  const names = authors.map(usr => getUserName(usr, env));
  let contents;
  if (!authors || authors.length === 0) {
    if (robot) {
      const name = t(`robot-name-${robot.type}`);
      contents = <span key={1} className="sole author">{name}</span>
    } else {
      contents = '\u00a0';
    }
  } else if (authors.length === 1) {
    contents = <span key={1} className="sole author">{names[0]}</span>;
  } else if (authors.length === 2) {
    const name1 = <span key={1} className="lead author">{names[0]}</span>;
    const name2 = <span key={3} className="co author">{names[1]}</span>
    contents = t('story-author-$name1-and-$name2', name1, name2);
  } else {
    const name1 = <span key={1} className="lead author">{names[0]}</span>;
    const coauthors = authors.slice(1);
    const props = {
      users: coauthors,
      label: t('story-author-$count-others', coauthors.length),
      title: t('story-coauthors'),
      env,
    };
    const others = <MultipleUserNames key={3} {...props} />
    contents = t('story-author-$name1-and-$name2', name1, others);
  }
  return <span className="author-names selectable">{contents}</span>;
}
