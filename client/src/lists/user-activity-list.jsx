import Moment from 'moment';
import React from 'react';

// widgets
import { ProfileImage } from '../widgets/profile-image.jsx';
import { Time } from '../widgets/time.jsx';

import './user-activity-list.scss';

/**
 * A short list showing a user's recent history. Used by UserView.
 */
export function UserActivityList(props) {
  const { route, env, user, stories, storyCountEstimate } = props;
  const { t, g } = env.locale;

  if (stories) {
    const sorted = sortStories(stories);
    return (
      <div className="user-activity-list">
        {sorted.map(renderActivity)}
      </div>
    );
  } else {
    const indices = [];
    for (let i = 0; i < storyCountEstimate; i++) {
      indices.push(i);
    }
    return (
      <div className="user-activity-list">
        {indices.map(renderActivityPlaceholder)}
      </div>
    );
  }

  function renderActivity(story) {
    const { date, search } = route.params;
    const params = { date, search, selectedUserID: user.id, highlightStoryID: story.id };
    const url = route.find('person-page', params);
    const labelClasses = [ 'label' ];
    const time = story.btime || story.ptime;
    const yesterday = env.getRelativeDate(-1, 'day');
    if (yesterday < time) {
      labelClasses.push('recent');
    }
    return (
      <div key={story.id} className="activity">
        <Time time={story.ptime} env={env} compact={true} />
        <div className={labelClasses.join(' ')}>
          <a href={url}>{renderText(story)}</a>
        </div>
      </div>
    );
  }

  function renderText(story) {
    const name = user?.details?.name;
    const gender = user?.details?.gender;
    g(name, gender);
    switch (story.type) {
      case 'push':
        return t(`user-activity-$name-pushed-code`, name);
      case 'merge':
        return t(`user-activity-$name-merged-code`, name);
      case 'branch':
        return t(`user-activity-$name-created-branch`, name);
      case 'tag':
        return t(`user-activity-$name-created-tag`, name);
      case 'issue':
        return t(`user-activity-$name-reported-issue`, name);
      case 'milestone':
        return t(`user-activity-$name-created-milestone`, name);
      case 'merge-request':
        return t(`user-activity-$name-created-merge-request`, name);
      case 'wiki':
        return t(`user-activity-$name-edited-wiki-page`, name);
      case 'member':
      case 'repo':
        const action = story.details.action;
        return t(`user-activity-$name-${action}-repo`, name);
      case 'post':
        const counts = {};
        for (let res of story.details.resources) {
          counts[res.type] = (counts[res.type] || 0) + 1;
        }
        if (counts.video > 0) {
          return t(`user-activity-$name-posted-$count-video-clips`, name, counts.video);
        } else if (counts.image > 0) {
          return t(`user-activity-$name-posted-$count-pictures`, name, counts.image);
        } else if (counts.audio > 0) {
          return t(`user-activity-$name-posted-$count-audio-clips`, name, counts.audio);
        } else if (counts.website > 0) {
          return t(`user-activity-$name-posted-$count-links`, name, counts.website);
        } else {
          return t(`user-activity-$name-wrote-post`, name);
        }
      case 'survey':
        return t(`user-activity-$name-started-survey`, name);
      case 'task-list':
        return t(`user-activity-$name-started-task-list`, name);
      case 'snapshot':
        return t(`user-activity-$name-modified-website`, name);
      default:
        return story.type;
    }
  }

  function renderActivityPlaceholder(index) {
    return <div key={index} className="activity">{'\u00a0'}</div>;
  }
}

function sortStories(stories) {
  const time = s => s.btime || s.ptime;
  return orderBy(stories, [ time ], [ 'desc' ]);
}
