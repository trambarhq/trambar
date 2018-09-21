import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import ComponentRefs from 'utils/component-refs';
import HTTPError from 'errors/http-error';
import * as NotificationFinder from 'objects/finders/notification-finder';
import * as UserFinder from 'objects/finders/user-finder';

import NewsPage from 'pages/news-page';
import PeoplePage from 'pages/people-page';
import NotificationsPage from 'pages/notifications-page';
import BookmarksPage from 'pages/bookmarks-page';
import SettingsPage from 'pages/settings-page';

// widgets
import Link from 'widgets/link';

import './bottom-navigation.scss';

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
        if (!params) {
            return null;
        }
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
            onClick: (section === 'news') ? this.handleActiveButtonClick : null,
        };
        let notificationsProps = {
            label: t('bottom-nav-notifications'),
            icon: 'comments',
            active: (section === 'notifications'),
            stacking,
            url: this.getPageURL(NotificationsPage),
            onClick: (section === 'notifications') ? this.handleActiveButtonClick : null,
        };
        let bookmarksProps = {
            label: t('bottom-nav-bookmarks'),
            icon: 'bookmark',
            active: (section === 'bookmarks'),
            stacking,
            url: this.getPageURL(BookmarksPage),
            onClick: (section === 'bookmarks') ? this.handleActiveButtonClick : null,
        };
        let peopleProps = {
            label: t('bottom-nav-people'),
            icon: 'users',
            active: (section === 'people'),
            stacking,
            url: this.getPageURL(PeoplePage),
            onClick: (section === 'people') ? this.handleActiveButtonClick : null,
        };
        let settingsProps = {
            label: t('bottom-nav-settings'),
            icon: 'gears',
            active: (section === 'settings'),
            stacking,
            url: this.getPageURL(SettingsPage),
            onClick: (section === 'settings') ? this.handleActiveButtonClick : null,
        };
        let newNotificationProps = { database, route };
        return (
            <div ref={setters.container} className="container">
                <Button {...newsProps} />
                <Button {...notificationsProps}>
                    <NewNotificationsBadge {...newNotificationProps} />
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
        let container = this.components.container;
        if (container) {
            let icon = container.getElementsByClassName('fa')[1];
            let label = container.getElementsByClassName('label')[1];
            let stacking = (label.offsetTop >= icon.offsetTop + icon.offsetHeight);
            if (this.state.stacking !== stacking) {
                this.setState({ stacking });
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

    /**
     * Called when user clicks a button that's already active
     *
     * @param  {Event} evt
     */
    handleActiveButtonClick = (evt) => {
        let page = document.getElementsByClassName('page-container')[0];
        if (page && page.scrollTop > 0) {
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                // stop momentum scrolling
                page.style.overflowY = 'hidden';
                page.scrollTop = 0;
                page.style.overflowY = 'scroll';
            } else {
                page.scrollTop = 0;
            }
        }
    }
}

function Button(props) {
    let {
        className,
        url,
        label,
        icon,
        children,
        active,
        stacking,
        onClick
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
            <Link className={className} url={url} onClick={onClick}>
                <i className={`fa fa-${icon}`} />
                    {children}
                    {' '}
                <span className="label">{label}</span>
            </Link>
        );
    } else {
        return (
            <Link className={className} url={url} onClick={onClick}>
                <i className={`fa fa-${icon}`} />
                {' '}
                <span className="label">{label}</span>
                {children}
            </Link>
        );
    }
}

class NewNotificationsBadge extends AsyncComponent {
    static displayName = 'NewNotificationsBadge';

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database } = this.props;
        if (!database.context.schema) {
            return null;
        }
        if (!database.authorized) {
            return nul;
        }
        let db = database.use({ by: this });
        return db.start().then((currentUserID) => {
            return UserFinder.findUser(db, currentUserID).then((user) => {
                return NotificationFinder.findNotificationsUnseenByUser(db, user).then((notifications) => {
                    let count = notifications.length;
                    if (process.env.PLATFORM === 'browser') {
                        changeFavIcon(count);
                        changeDocumentTitle(count);
                    }
                    if (!count) {
                        return null;
                    }
                    return (
                        <span className="badge">
                            <span className="number">{count}</span>
                        </span>
                    )
                });
            });
        });
    }
}

if (process.env.PLATFORM === 'browser') {
    let favIcons;

    /**
     * Use favicon with a badge if there are unread notifications
     *
     * @param  {Number} count
     */
    let changeFavIcon = function(count) {
        if (!favIcons) {
            // get the post-WebPack filenames of the favicons
            let paths = require.context('favicon-notification', true, /\.png$/).keys();
            favIcons = _.map(paths, (path) => {
                // make the file extension part of the expression passed to require()
                // so WebPack will filter out other files
                let name = path.substring(path.indexOf('/') + 1, path.lastIndexOf('.'));
                let withoutBadge = require(`favicon/${name}.png`);
                let withBadge = require(`favicon-notification/${name}.png`);
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

    let changeDocumentTitle = function(count) {
        let title = _.replace(document.title, /^\(\d+\)\s*/, '');
        if (count > 0) {
            title = `(${count}) ${title}`;
        }
        document.title = title;
    }
}

export {
    BottomNavigation as default,
    BottomNavigation,
    NewNotificationsBadge,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NewNotificationsBadge.propTypes = {
        stacking: PropTypes.bool,
        hasAccess: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
    };
    BottomNavigation.propTypes = {
        settings: PropTypes.object.isRequired,
        hasAccess: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
