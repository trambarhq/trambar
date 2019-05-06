import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import ComponentRefs from 'common/utils/component-refs.mjs';
import HTTPError from 'common/errors/http-error.mjs';
import * as NotificationFinder from 'common/objects/finders/notification-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import { setApplicationIconBadgeNumber } from 'common/transport/push-notifier.mjs';

// widgets
import Link from './link.jsx';
import ErrorBoundary from 'common/widgets/error-boundary.jsx';

import './bottom-navigation.scss';

/**
 * Row of buttons at the bottom of the user interface.
 *
 * @extends PureComponent
 */
class BottomNavigation extends PureComponent {
    static displayName = 'BottomNavigation';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            container: HTMLDivElement,
        });
        this.state =  {
            height: this.isHidden() ? 0 : 'auto',
            stacking: false,
        };
    }

    /**
     * Return true if bottom nav is supposed to be hidden
     *
     * @param  {Object|undefined} props
     *
     * @return {Boolean}
     */
    isHidden(props) {
        let { settings } = props || this.props;
        return !_.get(settings, 'navigation.bottom', true);
    }

    /**
     * Return a URL that points to the given page.
     *
     * @param  {String} pageName
     *
     * @return {String|null}
     */
    getPageURL(pageName) {
        let { settings, route } = this.props;
        let params = _.get(settings, 'navigation.route');
        let url = route.find(pageName, params);
        return url;
    }

    /**
     * Change this.state.height when this.props.hidden changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { container } = this.components;
        let hiddenBefore = this.isHidden();
        let hiddenAfter = this.isHidden(nextProps);
        if (hiddenBefore !== hiddenAfter) {
            let contentHeight = container.offsetHeight;
            if (hiddenAfter) {
                // hiding navigation:
                //
                // render with height = contentHeight, then
                // render with height = 0 immediately
                this.setState({ height: contentHeight });
                setTimeout(() => {
                    if (this.isHidden()) {
                        this.setState({ height: 0 });
                    }
                }, 0);
            } else {
                // showing navigation:
                //
                // render with height = contentHeight, then
                // render with height = auto after a second
                this.setState({ height: contentHeight });
                setTimeout(() => {
                    if (!this.isHidden()) {
                        this.setState({ height: 'auto' });
                    }
                }, 1000);
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { height } = this.state;
        return (
            <footer className="bottom-navigation" style={{ height }}>
                {this.renderButtons()}
            </footer>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { database, route, env, settings } = this.props;
        let { stacking } = this.state;
        let { setters } = this.components;
        let { t } = env.locale;
        let section = _.get(settings, 'navigation.section');
        let newsProps = {
            label: t('bottom-nav-news'),
            icon: 'newspaper-o',
            active: (section === 'news'),
            stacking,
            url: this.getPageURL('news-page'),
        };
        let notificationsProps = {
            label: t('bottom-nav-notifications'),
            icon: 'comments',
            active: (section === 'notifications'),
            stacking,
            url: this.getPageURL('notifications-page'),
        };
        let bookmarksProps = {
            label: t('bottom-nav-bookmarks'),
            icon: 'bookmark',
            active: (section === 'bookmarks'),
            stacking,
            url: this.getPageURL('bookmarks-page'),
        };
        let peopleProps = {
            label: t('bottom-nav-people'),
            icon: 'users',
            active: (section === 'people'),
            stacking,
            url: this.getPageURL('people-page'),
        };
        let settingsProps = {
            label: t('bottom-nav-settings'),
            icon: 'gears',
            active: (section === 'settings'),
            stacking,
            url: this.getPageURL('settings-page'),
        };
        let newNotificationProps = { database, route, env };
        return (
            <div ref={setters.container} className="container">
                <Button {...newsProps} />
                <Button {...notificationsProps}>
                    <ErrorBoundary env={env} showError={false}>
                        <NewNotificationsBadge {...newNotificationProps} />
                    </ErrorBoundary>
                </Button>
                <Button {...bookmarksProps} />
                <Button {...peopleProps} />
                <Button {...settingsProps} />
            </div>
        );
    }

    /**
     * Perform stacking check on mount and add resize handler
     */
    componentDidMount() {
        this.detectStacking();
        window.addEventListener('resize', this.handleWindowResize);
    }

    /**
     * Remove resize listener
     */
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleWindowResize);
    }

    /**
     * Check if icon and text labels are on top of each other
     */
    detectStacking() {
        let { stacking } = this.state;
        let { container } = this.components;
        if (container) {
            let icon = container.getElementsByClassName('fa')[1];
            let label = container.getElementsByClassName('label')[1];
            let stackingAfter = (label.offsetTop >= icon.offsetTop + icon.offsetHeight);
            if (stackingAfter !== stacking) {
                this.setState({ stacking: stackingAfter });
            }
        }
    }

    /**
     * Called when user resize the browser window
     *
     * @param  {Event} evt
     */
    handleWindowResize = (evt) => {
        this.detectStacking();
    }
}

/**
 * Stateless component that renders a clickable button.
 */
function Button(props) {
    let {
        className,
        url,
        label,
        icon,
        children,
        active,
        stacking,
    } = props;
    className = 'button' + ((className) ? ` ${className}` : '');
    if (active) {
        className += ' active';
    }
    if (stacking) {
        className += ' stacking';
    }
    if (stacking) {
        return (
            <Link className={className} url={url}>
                <i className={`fa fa-${icon}`} />
                    {children}
                    {' '}
                <span className="label">{label}</span>
            </Link>
        );
    } else {
        return (
            <Link className={className} url={url}>
                <i className={`fa fa-${icon}`} />
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
 *
 * @extends AsyncComponent
 */
class NewNotificationsBadge extends AsyncComponent {
    static displayName = 'NewNotificationsBadge';

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, env } = this.props;
        if (!database.context.schema) {
            return null;
        }
        if (!database.authorized) {
            return null;
        }
        let db = database.use({ by: this });
        let currentUserID = await db.start();
        let currentUser = await UserFinder.findUser(db, currentUserID);
        let notifications = await NotificationFinder.findNotificationsUnseenByUser(db, currentUser);
        let count = notifications.length;
        if (env.platform === 'browser') {
            changeFavIcon(count);
            changeDocumentTitle(count);
        } else if (env.platform === 'cordova') {
            setApplicationIconBadgeNumber(count);
        }
        if (!count) {
            return null;
        }
        return (
            <span className="badge">
                <span className="number">{count}</span>
            </span>
        );
    }
}

let favIcons;

/**
 * Use favicon with a badge if there are unread notifications
 *
 * @param  {Number} count
 */
function changeFavIcon(count) {
    if (!favIcons) {
        // get the post-WebPack filenames of the favicons
        let paths = require.context('../../assets/favicon-notification', true, /\.png$/).keys();
        favIcons = _.map(paths, (path) => {
            // make the file extension part of the expression passed to require()
            // so WebPack will filter out other files
            let name = path.substring(path.indexOf('/') + 1, path.lastIndexOf('.'));
            let withoutBadge = require(`../../assets/favicon/${name}.png`);
            let withBadge = require(`../../assets/favicon-notification/${name}.png`);
            return { withoutBadge, withBadge };
        });
    }
    let links = _.filter(document.head.getElementsByTagName('LINK'), (link) => {
        if (link.rel === 'icon' || link.rel === 'apple-touch-icon-precomposed') {
            return true;
        }
    });
    _.each(links, (link) => {
        let currentFilename = link.getAttribute('href');
        if (count > 0) {
            let icon = _.find(favIcons, { withoutBadge: currentFilename });
            if (icon) {
                link.href = icon.withBadge;
            }
        } else {
            let icon = _.find(favIcons, { withBadge: currentFilename });
            if (icon) {
                link.href = icon.withoutBadge;
            }
        }
    });
}

/**
 * Add the number of un-read notifications to the document's title, so the
 * user would see it if he's browsing in another tab.
 *
 * @param  {Number} count
 */
function changeDocumentTitle(count) {
    let title = _.replace(document.title, /^\(\d+\)\s*/, '');
    if (count > 0) {
        title = `(${count}) ${title}`;
    }
    document.title = title;
}

export {
    BottomNavigation as default,
    BottomNavigation,
    NewNotificationsBadge,
};

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NewNotificationsBadge.propTypes = {
        stacking: PropTypes.bool,
        hasAccess: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    BottomNavigation.propTypes = {
        settings: PropTypes.object.isRequired,
        hasAccess: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
