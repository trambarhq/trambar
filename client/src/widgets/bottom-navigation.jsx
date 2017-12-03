/**
 * BottomNavigation - React component
 *
 * Buttons at the bottom of the screen for going from section to section.
 */
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

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
        hidden: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
            height: (this.props.hidden) ? 0 : 'auto',
        };
    },

    /**
     * Change this.state.height when this.props.hidden changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.hidden !== nextProps.hidden) {
            var container = this.refs.container;
            var contentHeight = container.offsetHeight;
            if (nextProps.hidden) {
                // hiding navigation:
                //
                // render with height = contentHeight, then
                // render with height = 0 immediately
                this.setState({ height: contentHeight });
                setTimeout(() => {
                    if (this.props.hidden) {
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
                    if (!this.props.hidden) {
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
        var route = this.props.route;
        var params = _.pick(route.parameters, 'schema');
        var options = route.component.getOptions(route);
        var section = _.get(options, 'navigation.bottom.section');
        var newsProps = {
            label: t('bottom-nav-news'),
            icon: 'newspaper-o',
            active: (section === 'news'),
            url: route.find(NewsPage, params),
            onClick: this.handleButtonClick,
        };
        var notificationsProps = {
            label: t('bottom-nav-notifications'),
            icon: 'comments',
            active: (section === 'notifications'),
            url: route.find(NotificationsPage, params),
            onClick: this.handleButtonClick,
        };
        var bookmarksProps = {
            label: t('bottom-nav-bookmarks'),
            icon: 'bookmark',
            active: (section === 'bookmarks'),
            url: route.find(BookmarksPage, params),
            onClick: this.handleButtonClick,
        };
        var peopleProps = {
            label: t('bottom-nav-people'),
            icon: 'users',
            active: (section === 'people'),
            url: route.find(PeoplePage, params),
            onClick: this.handleButtonClick,
        };
        var settingsProps = {
            label: t('bottom-nav-settings'),
            icon: 'gears',
            active: (section === 'settings'),
            url: route.find(SettingsPage, params),
            onClick: this.handleButtonClick,
        };
        var newNotiifcationProps = {
            database: this.props.database,
            route: this.props.route,
        };
        return (
            <div ref="container" className="container">
                <Button {...newsProps} />
                <Button {...notificationsProps}>
                    <NewNotificationsBadge {...newNotiifcationProps} />
                </Button>
                <Button {...bookmarksProps} />
                <Button {...peopleProps} />
                <Button {...settingsProps} />
            </div>
        );
    },
});

function Button(props) {
    var classes = [ 'button' ];
    if (props.className) {
        classes.push(props.className);
    }
    if (props.active) {
        classes.push('active');
    }
    return (
        <Link className={classes.join(' ')} url={props.url}>
            <i className={`fa fa-${props.icon}`} />
            {' '}
            <span className="label">{props.label}</span>
            {props.children}
        </Link>
    );
}

var NewNotificationsBadge = Relaks.createClass({
    displayName: 'NewNotificationsBadge',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
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
        var db = this.props.database.use({ schema: params.schema, by: this });
        var props = {
            currentUser: null,
            notifications: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
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
