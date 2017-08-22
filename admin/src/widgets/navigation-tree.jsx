var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// pages
var ProjectListPage = require('pages/project-list-page');
var ProjectSummaryPage = require('pages/project-summary-page');
var MemberListPage = require('pages/member-list-page');
var RoleListPage = require('pages/role-list-page');
var RolePage = require('pages/role-summary-page');
var RepoListPage = require('pages/repo-list-page');
var RepoSummaryPage = require('pages/repo-summary-page');
var ServerListPage = require('pages/server-list-page');
var ServerSummaryPage = require('pages/server-summary-page');
var SettingsPage = require('pages/settings-page');
var UserListPage = require('pages/user-list-page');
var UserSummaryPage = require('pages/user-summary-page');

// widgets
var CollapsibleContainer = require('widgets/collapsible-container');

require('./navigation-tree.scss');

module.exports = Relaks.createClass({
    displayName: 'NavigationTree',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            project: null,
            user: null,
            role: null,
            server: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NavigationTreeSync {...props} />);
        return db.start().then((userId) => {
            var params = this.props.route.parameters;
            if (params.projectId) {
                var criteria = { id: params.projectId };
                return db.findOne({ schema: 'global', table: 'project', criteria }).then((project) => {
                    props.project = project;
                });
            } else if (params.userId) {
                var criteria = { id: params.userId };
                return db.findOne({ schema: 'global', table: 'user', criteria }).then((user) => {
                    props.user = user;
                });
            } else if (params.roleId) {
                var criteria = { id: params.roleId };
                return db.findOne({ schema: 'global', table: 'role', criteria }).then((role) => {
                    props.role = role;
                });
            } else if (params.serverId) {
                var criteria = { id: params.serverId };
                return db.findOne({ schema: 'global', table: 'server', criteria }).then((server) => {
                    props.server = server;
                });
            }
        }).then(() => {
            return <NavigationTreeSync {...props} />;
        });
    },
});

var NavigationTreeSync = module.exports.Sync = React.createClass({
    displayName: 'NavigationTree.Sync',
    propTypes: {
        project: PropTypes.object,
        user: PropTypes.object,
        role: PropTypes.object,
        server: PropTypes.object,

        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
            arrowPosition: 0,
            arrowCount: 0,
            arrowAction: '',

            project: this.props.project,
            user: this.props.user,
            role: this.props.role,
            server: this.props.server,
        };
    },

    /**
     * Save copies of objects so we can still render their names while
     * the section is collapsing
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (nextProps.project) {
            this.setState({ project: nextProps.project });
        } else if (nextProps.user) {
            this.setState({ user: nextProps.user });
        } else if (nextProps.role) {
            this.setState({ role: nextProps.role });
        } else if (nextProps.server) {
            this.setState({ server: nextProps.server });
        }
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
            className: `arrow ${numbers[this.state.arrowCount]} ${this.state.arrowAction}`,
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
        var url = this.props.route.path;
        var project = this.state.project || { details: {} };
        var projectName = p(project.details.title) || project.name || t('nav-project-name-pending');
        var projectId = project.id;
        var listUrl = ProjectListPage.getUrl();
        var summaryUrl = ProjectSummaryPage.getUrl({ projectId });
        var memberListUrl = MemberListPage.getUrl({ projectId });
        var repoListUrl = RepoListPage.getUrl({ projectId });
        var robotListUrl = '/todo/';
        var openLevel3 = (url === memberListUrl || url === repoListUrl || url === robotListUrl);
        var openLevel2 = (openLevel3 || url === summaryUrl);
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-projects'))}
                <CollapsibleContainer open={openLevel2}>
                    <div className="level2">
                        {this.renderLink(summaryUrl, projectName)}
                        <div className="level3">
                            {this.renderLink(memberListUrl, t('nav-members'))}
                        </div>
                        <div className="level3">
                            {this.renderLink(repoListUrl, t('nav-repositories'))}
                        </div>
                        <div className="level3">
                            {this.renderLink(robotListUrl, t('nav-robots'))}
                        </div>
                    </div>
                </CollapsibleContainer>
            </div>
        );
    },

    renderUserSection: function() {
        var t = this.props.locale.translate;
        var url = this.props.route.url;
        var userName = _.get(this.state.user, 'details.name') || t('nav-user-name-pending');
        var userId = _.get(this.state.user, 'id', 0);
        var listUrl = UserListPage.getUrl();
        var summaryUrl = UserSummaryPage.getUrl({ userId });
        var openLevel3 = false;
        var openLevel2 = (openLevel3 || url === summaryUrl);
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-users'))}
                <CollapsibleContainer open={openLevel2}>
                    <div className="level2">
                        {this.renderLink(summaryUrl, userName)}
                    </div>
                </CollapsibleContainer>
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
        var listUrl = ServerListPage.getUrl();
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-servers'))}
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
        var id = (url === this.props.route.path) ? 'active-nav-link' : undefined;
        return (
            <a href={url} id={id}>{label}</a>
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
        setTimeout(() => {
            // find the link level
            var level = 0;
            var active = document.getElementById('active-nav-link');
            if (active) {
                for (var n = active; n; n = n.parentNode) {
                    var m;
                    if (m = /level(\d)/.exec(n.className)) {
                        level = parseInt(m[1]);
                        break;
                    }
                }
            }

            var action = '';
            if (level > this.state.arrowCount) {
                action = 'extending';
            } else if (level < this.state.arrowCount) {
                action = 'retracting';
            }
            this.setState({ arrowAction: action, arrowCount: level })
        }, 50);

        var arrow = this.refs.arrow;
        var container = this.refs.container;
        var interval = setInterval(() => {
            // calculate the position of the arrow
            var pos = 0;
            var active = document.getElementById('active-nav-link');
            if (active) {
                var arrowRect = arrow.getBoundingClientRect();
                var linkRect = active.getBoundingClientRect();
                var containerRect = container.getBoundingClientRect();
                pos = Math.floor(linkRect.top + ((linkRect.height - arrowRect.height) / 2) - containerRect.top) + 1;
            }
            if (pos !== this.state.arrowPosition) {
                this.setState({ arrowPosition: pos });
            } else {
                clearInterval(interval);
            }
        }, 50);
    },
});
