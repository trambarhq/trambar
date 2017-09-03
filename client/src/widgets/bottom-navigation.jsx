/**
 * BottomNavigation - React component
 *
 * Buttons at the bottom of the screen for going from section to section.
 */
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var NewsPage = require('pages/news-page');
var PeoplePage = require('pages/people-page');
var NotificationsPage = require('pages/notifications-page');
var BookmarksPage = require('pages/bookmarks-page');
var SettingsPage = require('pages/settings-page');

require('./bottom-navigation.scss');

module.exports = React.createClass({
    displayName: 'BottomNavigation',
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
                setTimeout(() => { this.setState({ height: 0 }) }, 0);
            } else {
                // showing navigation:
                //
                // render with height = contentHeight, then
                // render with height = auto after a second
                this.setState({ height: contentHeight });
                setTimeout(() => { this.setState({ height: 'auto' }) }, 1000);
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
        var location = _.pick(this.props.route.parameters, 'server', 'schema');
        var section = _.get(this.props.route.component, 'navigation.bottom.section');
        var newsButtonProps = {
            label: t('bottom-nav-news'),
            icon: 'newspaper-o',
            active: (section === 'news'),
            href: NewsPage.getUrl(location),
            onClick: this.handleButtonClick,
        };
        var notificationsButtonProps = {
            label: t('bottom-nav-notifications'),
            icon: 'comments',
            active: (section === 'notifications'),
            href: NotificationsPage.getUrl(location),
            onClick: this.handleButtonClick,
        };
        var bookmarksButtonProps = {
            label: t('bottom-nav-bookmarks'),
            icon: 'bookmark',
            active: (section === 'bookmarks'),
            href: BookmarksPage.getUrl(location),
            onClick: this.handleButtonClick,
        };
        var peopleButtonProps = {
            label: t('bottom-nav-people'),
            icon: 'users',
            active: (section === 'people'),
            href: PeoplePage.getUrl(location),
            onClick: this.handleButtonClick,
        };
        var settingsButtonProps = {
            label: t('bottom-nav-settings'),
            icon: 'gears',
            active: (section === 'settings'),
            href: SettingsPage.getUrl(location),
            onClick: this.handleButtonClick,
        };
        return (
            <div ref="container" className="container">
                <Button {...newsButtonProps} />
                <Button {...notificationsButtonProps} />
                <Button {...bookmarksButtonProps} />
                <Button {...peopleButtonProps} />
                <Button {...settingsButtonProps} />
            </div>
        );
    },
});

function Button(props) {
    var classes = [ 'button' ];
    var clickHandler = props.onClick;
    if (props.className) {
        classes.push(props.className);
    }
    if (props.active) {
        classes.push('active');
    }
    return (
        <a className={classes.join(' ')} href={props.href} onClick={clickHandler}>
            <i className={`fa fa-${props.icon}`} />
            {' '}
            <span className="label">{props.label}</span>
        </a>
    );
}
