import _ from 'lodash';
import React, { useState, useEffect } from 'react';
import Relaks, { useProgress } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import Merger from 'common/data/merger.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as StoryFinder from 'common/objects/finders/story-finder.mjs';

// widgets
import { SmartList } from 'common/widgets/smart-list.jsx';
import { NotificationView } from '../views/notification-view.jsx';
import { NewItemsAlert } from '../widgets/new-items-alert.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './notification-list.scss';

const minimumSeenDelay = 3000;
const maximumSeenDelay = 5000;
const delayPerNotification = 1500;

async function NotificationList(props) {
  const { database, route, env } = props;
  const { currentUser, notifications } = props;
  const { scrollToNotificationID } = props;
  const { t } = env.locale;
  const [ hiddenNotificationIDs, setHiddenNotificationIDs] = useState([]);
  const [ viewDurations ] = useState({});
  const [ show ]  = useProgress();

  const handleNotificationIdentity = (evt) => {
    return getAnchor(evt.item.id);
  };
  const handleNotificationRender = (evt) => {
    return renderNotification(evt.item, evt.needed, evt.previousHeight, evt.estimatedHeight);
  };
  const handleNotificationAnchorChange = (evt) => {
    const scrollToNotificationID = evt.item?.id;
    route.replace({ scrollToNotificationID });
  };
  const handleNotificationBeforeAnchor = (evt) => {
    setHiddenNotificationIDs(_.map(evt.items, 'id'));
  };
  const handleNewNotificationAlertClick = (evt) => {
    setHiddenNotificationIDs([]);
  };
  const handleNotificationClick = (evt) => {
    let notification = evt.target.props.notification;
    if (!notification.seen) {
      markAsSeen([ notification ]);
    }
  };

  useEffect(() => {
    const interval = setInterval(updateNotificationView, 250);
    return () => {
      clearInterval(interval);
    };
  }, []);

  render();
  const users = await UserFinder.findNotificationTriggerers(database, notifications);
  render();
  const stories = await StoryFinder.findStoriesOfNotifications(database, notifications, currentUser);
  render();

  function render() {
    const smartListProps = {
      items: sortNotifications(notifications),
      behind: 20,
      ahead: 40,
      anchor: getAnchor(scrollToNotificationID),
      offset: 10,

      onIdentity: handleNotificationIdentity,
      onRender: handleNotificationRender,
      onAnchorChange: handleNotificationAnchorChange,
      onBeforeAnchor: handleNotificationBeforeAnchor,
    };
    show(
      <div className="notification-list">
        <SmartList {...smartListProps} />
        {renderNewNotificationAlert()}
      </div>
    );
  }

  function renderNotification(notification, needed, previousHeight, estimatedHeight) {
    if (needed) {
      const user = findUser(users, notification);
      const props = {
        notification,
        user,
        database,
        route,
        env,
        onClick: handleNotificationClick,
      };
      return (
        <ErrorBoundary env={env}>
          <NotificationView key={notification.id} {...props} />
        </ErrorBoundary>
      );
    } else {
      const height = previousHeight || estimatedHeight || 25;
      return <div className="notification-view" style={{ height }} />
    }
  }

  function renderNewNotificationAlert() {
    const count = _.size(hiddenNotificationIDs);
    let url;
    if (!_.isEmpty(hiddenNotificationIDs)) {
      url  = route.find(route.name, {
        highlightingNotification: _.first(hiddenNotificationIDs)
      });
    }
    const props = { url, onClick: handleNewNotificationAlertClick };
    return (
      <NewItemsAlert {...props}>
        {t('alert-$count-new-notifications', count)}
      </NewItemsAlert>
    );
  }

  function updateNotificationView() {
    if (!env.focus || !env.visible)  {
      return;
    }
    const unread = _.filter(notifications, (notification) => {
      if (!notification.seen) {
        if (!_.includes(hiddenNotificationIDs, notification.id)) {
          return true;
        }
      }
    });

    // remove the one that have appeared recently
    _.remove(unread, (notification) => {
      const viewDuration = viewDurations[notification.id] || 0 + 250;
      notificationView.durations[notification.id] = viewDuration;
      if (viewDuration < minimumSeenDelay) {
        return true;
      }
    });

    // what the require view duration ought to be--the more notifications
    // there are, the longer it is
    const requiredDuration = _.clamp(unread.length * delayPerNotification, minimumSeenDelay, maximumSeenDelay);
    const allReady = _.every(unread, (notification) => {
      const viewDuration = viewDurations[notification.id] || 0;
      return (viewDuration > requiredDuration);
    });
    if (allReady && !_.isEmpty(unread)) {
      markAsSeen(unread);
    }
  }

  async function markAsSeen(notifications) {
    const changes = _.map(notifications, (notification) => {
      return { id: notification.id, seen: true };
    });
    await db.save({ table: 'notification' }, changes);
  }

  function getAnchor(notificationID) {
    return (notificationID) ? `notification-${notificationID}` : undefined;
  }
}

const sortNotifications = memoizeWeak(null, function(notifications) {
  return _.orderBy(notifications, [ 'ctime' ], [ 'desc' ]);
});

const findUser = memoizeWeak(null, function(users, notification) {
  if (notification) {
    return _.find(users, { id: notification.user_id });
  }
});

const component = Relaks.memo(NotificationList);

export {
  component as default,
  component as NotificationList,
};
