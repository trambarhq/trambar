import React, { useState, useEffect } from 'react';
import { useProgress } from 'relaks';
import { findNotificationTriggerers } from 'common/objects/finders/user-finder.js';
import { findStoriesOfNotifications } from 'common/objects/finders/story-finder.js';
import { orderBy } from 'common/utils/array-utils.js';

// widgets
import { SmartList } from 'common/widgets/smart-list.jsx';
import { NotificationView } from '../views/notification-view.jsx';
import { NewItemsAlert } from '../widgets/new-items-alert.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './notification-list.scss';

const minimumSeenDelay = 3000;
const maximumSeenDelay = 5000;
const delayPerNotification = 1500;

export async function NotificationList(props) {
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
    setHiddenNotificationIDs(evt.items.map(n => n.id));
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
  const users = await findNotificationTriggerers(database, notifications);
  render();
  const stories = await findStoriesOfNotifications(database, notifications, currentUser);
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
      const user = users?.find(usr => usr.id === notification.user_id);
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
    let url;
    const scrollToNotificationID = hiddenNotificationIDs[0];
    if (scrollToNotificationID) {
      url  = route.find(route.name, { scrollToNotificationID });
    }
    const props = { url, onClick: handleNewNotificationAlertClick };
    return (
      <NewItemsAlert {...props}>
        {t('alert-$count-new-notifications', hiddenNotificationIDs.length)}
      </NewItemsAlert>
    );
  }

  function updateNotificationView() {
    if (!env.focus || !env.visible || !notifications)  {
      return;
    }
    const unread = notifications.filter((notification) => {
      if (!notification.seen) {
        if (!hiddenNotificationIDs.includes(notification.id)) {
          // exclude the one that have appeared recently
          const viewDuration = (viewDurations[notification.id] || 0) + 250;
          notificationView.durations[notification.id] = viewDuration;
          if (viewDuration < minimumSeenDelay) {
            return false;
          } else {
            return true;
          }
        }
      }
    });

    // what the require view duration ought to be--the more notifications
    // there are, the longer it is
    const delay = unread.length * delayPerNotification;
    const requiredDuration = Math.min(maximumSeenDelay, Math.max(minimumSeenDelay, delay));
    const allReady = unread.every((notification) => {
      const viewDuration = viewDurations[notification.id] || 0;
      return (viewDuration > requiredDuration);
    });
    if (allReady && unread.length > 0) {
      markAsSeen(unread);
    }
  }

  async function markAsSeen(notifications) {
    const changes = notifications.map((notification) => {
      return { id: notification.id, seen: true };
    });
    await db.save({ table: 'notification' }, changes);
  }

  function getAnchor(notificationID) {
    return (notificationID) ? `notification-${notificationID}` : undefined;
  }
}

function sortNotifications(notifications) {
  return orderBy(notifications, [ 'ctime' ], [ 'desc' ]);
}
