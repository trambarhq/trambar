/**
 * BottomNavigation - React component
 *
 * Buttons at the bottom of the screen for going from section to section.
 */
 var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var ComponentRefs = require('utils/component-refs');
var HTTPError = require('errors/http-error');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var NewsPage = require('pages/news-page');
var PeoplePage = require('pages/people-page');
var NotificationsPage = require('pages/notifications-page');
var BookmarksPage = require('pages/bookmarks-page');
var SettingsPage = require('pages/settings-page');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Link = require('widgets/link');

require('./bottom-navigation.scss');

module.exports = React.createClass({
    displayName: 'BottomNavigation',
    mixins: [ UpdateCheck ],
    propTypes: {
        settings: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            container: HTMLDivElement,
        });
        return {
            height: this.isHidden() ? 0 : 'auto',
            stacking: false,
        };
    },

    /**
     * Return true if bottom nav is supposed to be hidden
     *
     * @param  {Object|undefined} settings
     *
     * @return {Boolean}
     */
    isHidden: function(settings) {
        if (!settings) {
            settings = this.props.settings;
        }
        return !_.get(settings, 'navigation.bottom', true);
    },

    /**
     * Return a URL that points to the given page.
     *
     * @param  {ReactClass} pageClass
     * @param  {Route|undefined} route
     *
     * @return {String|null}
     */
    getPageURL: function(pageClass, route) {
        if (!route) {
            route = this.props.route;
        }
        var settings = (pageClass.configureUI) ? pageClass.configureUI(route) : null;
        var params = _.get(settings, 'navigation.route');
        if (!params) {
            return null;
        }
        return route.find(pageClass, params);
    },

    /**
     * Change this.state.height when this.props.hidden changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var hiddenBefore = this.isHidden();
        var hiddenAfter = this.isHidden(nextProps.settings);
        if (hiddenBefore !== hiddenAfter) {
            var container = this.components.container;
            var contentHeight = container.offsetHeight;
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
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var style = { height: this.state.height };
        return (
            <footer className="bottom-navigation" style={style}>
                {this.renderButtons()}
            </footer>
        );
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var setters = this.components.setters;
        var route = this.props.route;
        var section = _.get(this.props.settings, 'navigation.section');
        var newsProps = {
            label: t('bottom-nav-news'),
            icon: 'newspaper-o',
            active: (section === 'news'),
            stacking: this.state.stacking,
            url: this.getPageURL(NewsPage),
            onClick: this.handleButtonClick,
        };
        var notificationsProps = {
            label: t('bottom-nav-notifications'),
            icon: 'comments',
            active: (section === 'notifications'),
            stacking: this.state.stacking,
            url: this.getPageURL(NotificationsPage),
            onClick: this.handleButtonClick,
        };
        var bookmarksProps = {
            label: t('bottom-nav-bookmarks'),
            icon: 'bookmark',
            active: (section === 'bookmarks'),
            stacking: this.state.stacking,
            url: this.getPageURL(BookmarksPage),
            onClick: this.handleButtonClick,
        };
        var peopleProps = {
            label: t('bottom-nav-people'),
            icon: 'users',
            active: (section === 'people'),
            stacking: this.state.stacking,
            url: this.getPageURL(PeoplePage),
            onClick: this.handleButtonClick,
        };
        var settingsProps = {
            label: t('bottom-nav-settings'),
            icon: 'gears',
            active: (section === 'settings'),
            stacking: this.state.stacking,
            url: this.getPageURL(SettingsPage),
            onClick: this.handleButtonClick,
        };
        var newNotificationProps = {
            database: this.props.database,
            route: this.props.route,
        };
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
    },

    /**
     * Perform stacking check on mount and add resize handler
     */
    componentDidMount: function() {
        this.detectStacking();
        window.addEventListener('resize', this.handleWindowResize);
    },

    /**
     * Remove resize listener
     */
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
    },

    /**
     * Check if icon and text labels are on top of each other
     */
    detectStacking: function() {
        var container = this.components.container;
        if (container) {
            var icon = container.getElementsByClassName('fa')[1];
            var label = container.getElementsByClassName('label')[1];
            var stacking = (label.offsetTop >= icon.offsetTop + icon.offsetHeight);
            if (this.state.stacking !== stacking) {
                this.setState({ stacking });
            }
        }
    },

    /**
     * Called when user resize the browser window
     *
     * @param  {Event} evt
     */
    handleWindowResize: function(evt) {
        this.detectStacking();
    },
});

function Button(props) {
    var className = 'button';
    if (props.className) {
        className += ` ${props.className}`;
    }
    if (props.active) {
        className += ' active';
    }
    if (props.stacking) {
        className += ' stacking';
    }
    if (props.stacking) {
        return (
            <Link className={className} url={props.url}>
                <i className={`fa fa-${props.icon}`} />
                    {props.children}
                    {' '}
                <span className="label">{props.label}</span>
            </Link>
        );
    } else {
        return (
            <Link className={className} url={props.url}>
                <i className={`fa fa-${props.icon}`} />
                {' '}
                <span className="label">{props.label}</span>
                {props.children}
            </Link>
        );
    }
}

var NewNotificationsBadge = Relaks.createClass({
    displayName: 'NewNotificationsBadge',
    propTypes: {
        stacking: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
    },

    /**
     * Return initial state
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            failedSchemas: []
        };
    },

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        if (!params.schema) {
            return null;
        }
        if (_.includes(this.state.failedSchemas, params.schema)) {
            return null;
        }
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then((userId) => {
            var criteria = {
                target_user_id: userId,
                seen: false,
                limit: 100,
            };
            return db.find({ table: 'notification', criteria });
        }).then((notifications) => {
            var count = notifications.length;
            this.changeFavIcon(count);
            if (!count) {
                return null;
            }
            return (
                <span className="badge">
                    <span className="number">{count}</span>
                </span>
            )
        }).catch(HTTPError, (err) => {
            // don't try again when a failure occurs
            var failedSchemas = _.union(this.state.failedSchemas, [ params.schema ]);
            this.setState({ failedSchemas });
        });
    },

    /**
     * Use favicon with a badge if there are unread notifications
     *
     * @param  {Number} count
     */
    changeFavIcon: function(count) {
        var links = _.filter(document.head.getElementsByTagName('LINK'), (link) => {
            if (link.rel === 'icon' || link.rel === 'apple-touch-icon-precomposed') {
                return true;
            }
        });
        _.each(links, (link) => {
            var currentFilename = link.getAttribute('href');
            if (count > 0) {
                var icon = _.find(favIcons, { withoutBadge: currentFilename });
                if (icon) {
                    link.href = icon.withBadge;
                }
            } else {
                var icon = _.find(favIcons, { withBadge: currentFilename });
                if (icon) {
                    link.href = icon.withoutBadge;
                }
            }
        });
    }
});

// get the post-WebPack filenames of the favicons
var paths = require.context('favicon-notification', true, /\.png$/).keys();
var favIcons = _.map(paths, (path) => {
    // make the file extension part of the expression passed to require()
    // so WebPack will filter out other files
    var name = path.substring(path.indexOf('/') + 1, path.lastIndexOf('.'));
    var withoutBadge = require(`favicon/${name}.png`);
    var withBadge = require(`favicon-notification/${name}.png`);
    return { withoutBadge, withBadge };
});
