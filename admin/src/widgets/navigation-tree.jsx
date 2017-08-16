var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var ProjectListPage = require('pages/project-list-page');
var ProjectPage = require('pages/project-page');
var RoleListPage = require('pages/role-list-page');
var SettingsPage = require('pages/settings-page');
var UserListPage = require('pages/user-list-page');

require('./navigation-tree.scss');

module.exports = Relaks.createClass({
    moduleName: 'NavigationTree',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            users: null,
            currentUser: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NavigationTreeSync {...props} />);
        return db.start().then((userId) => {
            return <NavigationTreeSync {...props} />;
        });
    },
});

var NavigationTreeSync = module.exports.Sync = React.createClass({
    moduleName: 'NavigationTree.Sync',
    propTypes: {
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
            arrowPosition: 0,
            arrowCount: 0,

            project: null,
            user: null,
            role: null,
            server: null,
        };
    },

    render: function() {
        return (
            <div ref="container" className="navigation-tree">
                {this.renderProjectSection()}
                {this.renderUserSection()}
                {this.renderRoleSection()}
                {this.renderServiceSection()}
                {this.renderSettingsSection()}
                {this.renderArrow()}
            </div>
        );
    },

    renderArrow: function() {
        var numbers = [ 'zero', 'one', 'two', 'three' ];
        var arrowProps = {
            ref: 'arrow',
            className: `arrow ${numbers[this.state.arrowCount]}`,
            style: { top: this.state.arrowPosition },
        };
        return (
            <div {...arrowProps}>
                <i className="fa fa-play first" />
                <i className="fa fa-play second" />
                <i className="fa fa-play third" />
            </div>
        );
    },

    renderProjectSection: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var projectName = p(_.get(this.state.project, 'details.name')) || t('nav-project-name-pending');
        var projectId = _.get(this.state.project, 'id', 0);
        var listUrl = ProjectListPage.getUrl();
        var summaryUrl = ProjectPage.getUrl({ projectId });
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-projects'))}
                <div className="level2">
                    {this.renderLink(summaryUrl, projectName)}
                </div>
            </div>
        );
    },

    renderUserSection: function() {
        var t = this.props.locale.translate;
        var listUrl = UserListPage.getUrl();
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-users'))}
            </div>
        );
    },

    renderRoleSection: function() {
        var t = this.props.locale.translate;
        var listUrl = RoleListPage.getUrl();
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-roles'))}
            </div>
        );
    },

    renderServiceSection: function() {
        var t = this.props.locale.translate;
        var listUrl = '/todo/';
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-services'))}
            </div>
        );
    },

    renderSettingsSection: function() {
        var t = this.props.locale.translate;
        var listUrl = SettingsPage.getUrl();
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-settings'))}
            </div>
        );
    },

    renderLink: function(url, label) {
        return (
            <a href={url} onClick={this.handleLinkClick}>{label}</a>
        );
    },

    componentDidMount: function() {
        this.repositionArrow();
    },

    componentDidUpdate: function(prevProps, prevState) {
        if (prevProps.route !== this.props.route) {
            this.repositionArrow();
        }
    },

    repositionArrow: function() {
        var container = this.refs.container;
        var arrow = this.refs.arrow;
        var links = container.getElementsByTagName('A');
        var activeUrl = this.props.route.url;
        var active = _.find(links, (link) => {
            var url = link.getAttribute('href');
            if (url === activeUrl) {
                return true;
            }
        });
        var top = 0;
        var level = 0;
        if (active && arrow) {
            // calculate the position of the arrow
            var arrowRect = arrow.getBoundingClientRect();
            var linkRect = active.getBoundingClientRect();
            var containerRect = container.getBoundingClientRect();
            top = Math.floor(linkRect.top + ((linkRect.height - arrowRect.height) / 2) - containerRect.top) + 1;

            // find the level
            for (var n = active; n; n = n.parentNode) {
                var m;
                if (m = /level(\d)/.exec(n.className)) {
                    level = parseInt(m[1]);
                    break;
                }
            }
        }

        if (level >= this.state.arrowCount) {
            // move the arrow first, then telescope it
            this.setState({ arrowPosition: top }, () => {
                setTimeout(() => {
                    if (level != this.state.arrowCount) {
                        this.setState({ arrowCount: level });
                    }
                }, 300);
            });
        } else {
            // retract the arrow first, then move it
            this.setState({ arrowCount: level }, () => {
                setTimeout(() => {
                    this.setState({ arrowPosition: top });
                }, 300);
            });
        }
    },

    handleLinkClick: function(evt) {
        var url = evt.target.getAttribute('href');
        this.props.route.change(url);
        evt.preventDefault();
    }
});
