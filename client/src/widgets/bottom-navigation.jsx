var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var NewsPage = require('pages/news-page');
var UsersPage = require('pages/users-page');
var NotificationsPage = require('pages/notifications-page');
var BookmarksPage = require('pages/bookmarks-page');
var SettingsPage = require('pages/settings-page');

require('./bottom-navigation.scss');

module.exports = React.createClass({
    displayName: 'BottomNavigation',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <footer className="bottom-navigation">
                {this.renderButtons()}
            </footer>
        );
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        var location = _.pick(this.props.route.parameters, 'server', 'schema');
        var section = _.get(this.props.route.parameters, 'navigation.bottom.section');
        var newsButtonProps = {
            label: t('news'),
            icon: 'newspaper-o',
            active: (section === 'news'),
            href: NewsPage.getUrl(location),
            onClick: this.handleButtonClick,
        };
        var notificationsButtonProps = {
            label: t('notications'),
            icon: 'comments',
            active: (section === 'notifications'),
            href: NotificationsPage.getUrl(location),
            onClick: this.handleButtonClick,
        };
        var bookmarksButtonProps = {
            label: t('bookmarks'),
            icon: 'bookmark',
            active: (section === 'bookmarks'),
            href: BookmarksPage.getUrl(location),
            onClick: this.handleButtonClick,
        };
        var usersButtonProps = {
            label: t('people'),
            icon: 'users',
            active: (section === 'users'),
            href: UsersPage.getUrl(location),
            onClick: this.handleButtonClick,
        };
        var settingsButtonProps = {
            label: t('settings'),
            icon: 'gears',
            active: (section === 'settings'),
            href: SettingsPage.getUrl(location),
            onClick: this.handleButtonClick,
        };
        return (
            <div className="button-container">
                <Button {...newsButtonProps} />
                <Button {...notificationsButtonProps} />
                <Button {...bookmarksButtonProps} />
                <Button {...usersButtonProps} />
                <Button {...settingsButtonProps} />
            </div>
        );
    },

    handleButtonClick: function(evt) {
        var url = evt.currentTarget.getAttribute('href');
        evt.preventDefault();
        this.props.route.change(url);
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
