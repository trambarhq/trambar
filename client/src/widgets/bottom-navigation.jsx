import React, { useState, useRef, useEffect } from 'react';
import { useProgress } from 'relaks';
import { findNotificationsUnseenByUser } from 'common/objects/finders/notification-finder.js';
import { findUser } from 'common/objects/finders/user-finder.js';
import { setApplicationIconBadgeNumber } from 'common/transport/push-notifier.js';

// widgets
import { Link } from './link.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './bottom-navigation.scss';

/**
 * Row of buttons at the bottom of the user interface.
 */
export function BottomNavigation(props) {
  const { database, route, env, settings } = props;
  const { t } = env.locale;
  const routeParams = settings?.navigation?.route;
  const activeSection = settings?.navigation?.section;
  const showing = settings?.navigation?.bottom ?? true;
  const [ height, setHeight ] = useState();
  const [ stacking, setStacking ] = useState();
  const containerRef = useRef();

  useEffect(() => {
    const contentHeight = containerRef.current.offsetHeight;
    if (!showing) {
      setHeight(contentHeight);
      setTimeout(() => {
        setHeight(0);
      }, 0);
    } else {
      setHeight(contentHeight);
      setTimeout(() => {
        setHeight('auto');
      }, 1000);
    }
  }, [ showing ]);
  useEffect(() => {
    const detectStacking = () => {
      const icon = containerRef.current.getElementsByTagName('i')[1];
      const label = containerRef.current.getElementsByTagName('span')[1];
      let stackingAfter = (label.offsetTop >= icon.offsetTop + icon.offsetHeight);
      if (stackingAfter !== stacking) {
        setStacking(stackingAfter);
      }
    };
    window.addEventListener('resize', detectStacking);
    return () => {
      window.removeEventListener('resize', detectStacking);
    }
  }, [ stacking ]);

  return (
    <footer className="bottom-navigation" style={{ height }}>
      <div ref={containerRef} className="container">
        <ErrorBoundary env={env} showError={false}>
          {sections.map(renderButton)}
        </ErrorBoundary>
      </div>
    </footer>
  );

  function renderButton(section, i) {
    const { name, iconClass, label } = section;
    const url = route.find(`${name}-page`, routeParams);
    const active = (activeSection === name);
    const props = { label: t(label), iconClass, active, stacking, url };
    return <Button key={i} {...props}>{renderBadge(section)}</Button>;
  }

  function renderBadge(section) {
    const { name } = section;
    let Badge;
    if (name === 'notifications') {
      Badge = NewNotificationsBadge
    }
    if (Badge) {
      const props = { database, route, env };
      return <Badge {...props} />;
    }
  }
}

const sections = [
  {
    name: 'news',
    label: 'bottom-nav-news',
    iconClass: 'fas fa-newspaper',
  },
  {
    name: 'notifications',
    label: 'bottom-nav-notifications',
    iconClass: 'fas fa-comments',
  },
  {
    name: 'bookmarks',
    label: 'bottom-nav-bookmarks',
    iconClass: 'fas fa-bookmark',
  },
  {
    name: 'people',
    label: 'bottom-nav-people',
    iconClass: 'fas fa-users',
  },
  {
    name: 'settings',
    label: 'bottom-nav-settings',
    iconClass: 'fas fa-cogs',
  },
];

/**
 * Stateless component that renders a clickable button.
 */
function Button(props) {
  const { className, url, label, iconClass, children, active, stacking } = props;
  const classNames = [ 'button' ];
  if (className) {
    classNames.push(className);
  }
  if (active) {
    classNames.push('active');
  }
  if (stacking) {
    classNames.push('stacking');
  }
  if (stacking) {
    return (
      <Link className={classNames.join(' ')} url={url}>
        <i className={iconClass} />
          {children}
          {' '}
        <span className="label">{label}</span>
      </Link>
    );
  } else {
    return (
      <Link className={classNames.join(' ')} url={url}>
        <i className={iconClass} />
        {' '}
        <span className="label">{label}</span>
        {children}
      </Link>
    );
  }
}

/**
 * Asynchronous component that retrieves of un-read notifications from the
 * remote server. If there are any, it renders a small badge with a number.
 */
async function NewNotificationsBadge(props) {
  const { database, env } = props;
  const active = (database.context.schema && database.authorized);
  const db = database.use({ by: this });
  const [ show ] = useProgress();

  render();
  const currentUserID = await db.start();
  const currentUser = (active) ? await findUser(db, currentUserID) : null;
  const notifications = (active) ? await findNotificationsUnseenByUser(db, currentUser) : [];
  const count = notifications.length;
  render();

  if (env.platform === 'browser') {
    changeFavIcon(count);
    changeDocumentTitle(count);
  } else if (env.platform === 'cordova') {
    setApplicationIconBadgeNumber(count);
  }

  function render() {
    if (!count) {
      show(null);
    } else {
      show(
        <span className="badge">
          <span className="number">{count}</span>
        </span>
      );
    }
  }
}

let favIcons;

/**
 * Use favicon with a badge if there are unread notifications
 *
 * @param  {number} count
 */
function changeFavIcon(count) {
  if (!favIcons) {
    // get the post-WebPack filenames of the favicons
    const context = require.context('../../assets/favicon-notification', true, /\.png$/);
    favIcons = context.keys().map((path) => {
      // make the file extension part of the expression passed to require()
      // so WebPack will filter out other files
      const name = path.substring(path.indexOf('/') + 1, path.lastIndexOf('.'));
      const withoutBadge = require(`../../assets/favicon/${name}.png`);
      const withBadge = require(`../../assets/favicon-notification/${name}.png`);
      return { withoutBadge, withBadge };
    });
  }

  const links = document.head.getElementsByTagName('LINK');
  for (let link of links) {
    if (link.rel === 'icon' || link.rel === 'apple-touch-icon-precomposed') {
      const currentFilename = link.getAttribute('href');
      if (count > 0) {
        // replace badgeless with badge
        const icon = favIcons.find(i => i.withoutBadge === currentFilename);
        if (icon) {
          link.href = icon.withBadge;
        }
      } else {
        // replace badge with badgeless
        const icon = favIcons.find(i => i.withBadge === currentFilename);
        if (icon) {
          link.href = icon.withoutBadge;
        }
      }
    }
  }
}

/**
 * Add the number of un-read notifications to the document's title, so the
 * user would see it if he's browsing in another tab.
 *
 * @param  {number} count
 */
function changeDocumentTitle(count) {
  let title = document.title.replace(/^\(\d+\)\s*/, '');
  if (count > 0) {
    title = `(${count}) ${title}`;
  }
  document.title = title;
}
