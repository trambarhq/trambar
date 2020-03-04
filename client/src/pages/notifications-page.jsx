import _ from 'lodash';
import Moment from 'moment';
import React from 'react';
import { useProgress } from 'relaks';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as NotificationFinder from 'common/objects/finders/notification-finder.mjs';

// widgets
import { PageContainer } from '../widgets/page-container.jsx';
import { NotificationList } from '../lists/notification-list.jsx';
import { LoadingAnimation } from '../widgets/loading-animation.jsx';
import { EmptyMessage } from '../widgets/empty-message.jsx';

import './notifications-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Notifications page.
 */
export default async function NotificationsPage(props) {
  const { database, route, env, date, scrollToNotificationID } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const currentUser = await UserFinder.findUser(database, currentUserID);
  let notifications;
  if (date) {
    notifications = await NotificationFinder.findNotificationsForUserOnDate(database, currentUser, date);
  } else {
    notifications = await NotificationFinder.findNotificationsForUser(database, currentUser);
  }
  render();

  function render() {
    show(
      <PageContainer className="notifications-page">
        {renderList()}
        {renderEmptyMessage()}
      </PageContainer>
    );
  }

  function renderList() {
    const listProps = {
      notifications,
      currentUser,
      database,
      route,
      env,
      scrollToNotificationID,
    };
    return <NotificationList {...listProps} />;
  }

  function renderEmptyMessage() {
    if (!_.isEmpty(notifications)) {
      return null;
    }
    if (!notifications) {
      // props.notifications is undefined when they're being loaded
      return <LoadingAnimation />;
    } else {
      let phrase;
      if (date) {
        phrase = 'notifications-no-notifications-on-date';
      } else {
        phrase = 'notifications-no-notifications-yet';
      }
      const props = { phrase, env };
      return <EmptyMessage {...props} />;
    }
  }
}
