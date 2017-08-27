var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

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
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
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
        return db.start().then((currentUserId) => {
            var params = this.props.route.parameters;
            if (params.projectId) {
                var projectId = parseInt(params.projectId);
                if (projectId) {
                    var criteria = {
                        id: projectId
                    };
                    return db.findOne({ table: 'project', criteria }).then((project) => {
                        props.project = project;
                    });
                }
            } else if (params.userId) {
                var userId = parseInt(params.userId);
                if (userId) {
                    var criteria = {
                        id: parseInt(params.userId)
                    };
                    return db.findOne({ table: 'user', criteria }).then((user) => {
                        props.user = user;
                    });
                }
            } else if (params.roleId) {
                var roleId = parseInt(params.roleId);
                if (roleId) {
                    var criteria = {
                        id: roleId
                    };
                    return db.findOne({ table: 'role', criteria }).then((role) => {
                        props.role = role;
                    });
                }
            } else if (params.serverId) {
                var serverId = parseInt(params.serverId);
                if (serverId) {
                    var criteria = {
                        id: serverId
                    };
                    return db.findOne({ table: 'server', criteria }).then((server) => {
                        props.server = server;
                    });
                }
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

            project: this.props.project || emptyObject,
            user: this.props.user || emptyObject,
            role: this.props.role || emptyObject,
            server: this.props.server || emptyObject,
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
                {this.renderServerSection()}
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
        var project = this.state.project;
        var projectName = p(project.details.title) || project.name || t('nav-project-name-pending');
        var projectId = this.props.route.parameters.projectId;
        var url = this.props.route.path;
        var listUrl = require('pages/project-list-page').getUrl();
        var summaryUrl = require('pages/project-summary-page').getUrl({ projectId });
        var memberListUrl = require('pages/member-list-page').getUrl({ projectId });
        var repoListUrl = require('pages/repo-list-page').getUrl({ projectId });
        var robotListUrl = require('pages/robot-list-page').getUrl({ projectId });
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
        var userName = _.get(this.state.user, 'details.name') || t('nav-user-name-pending');
        var userId = this.props.route.parameters.userId;
        var url = this.props.route.path;
        var listUrl = require('pages/user-list-page').getUrl();
        var summaryUrl = require('pages/user-summary-page').getUrl({ userId });
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
        var p = this.props.locale.pick;
        var role = this.state.role;
        var roleName = p(role.details.title) || role.name || t('nav-role-name-pending');
        var roleId = this.props.route.parameters.roleId;
        var url = this.props.route.path;
        var listUrl = require('pages/role-list-page').getUrl();
        var summaryUrl = require('pages/role-summary-page').getUrl({ roleId });
        var openLevel3 = false;
        var openLevel2 = (openLevel3 || url === summaryUrl);
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-roles'))}
                <CollapsibleContainer open={openLevel2}>
                    <div className="level2">
                        {this.renderLink(summaryUrl, roleName)}
                    </div>
                </CollapsibleContainer>
            </div>
        );
    },

    renderServerSection: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var serverName = p(_.get(this.state.server, 'details.title')) || t('nav-server-name-pending');
        var serverId = this.props.route.parameters.serverId;
        var url = this.props.route.path;
        var listUrl = require('pages/server-list-page').getUrl();
        var summaryUrl = require('pages/server-summary-page').getUrl({ serverId });
        var openLevel3 = false;
        var openLevel2 = (openLevel3 || url === summaryUrl);
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-servers'))}
                <CollapsibleContainer open={openLevel2}>
                    <div className="level2">
                        {this.renderLink(summaryUrl, serverName)}
                    </div>
                </CollapsibleContainer>
            </div>
        );
    },

    renderSettingsSection: function() {
        var t = this.props.locale.translate;
        var listUrl = require('pages/settings-page').getUrl();
        return (
            <div className="level1">
                {this.renderLink(listUrl, t('nav-settings'))}
            </div>
        );
    },

    renderLink: function(url, label) {
        var ref = (url === this.props.route.path) ? 'activeLink' : undefined;
        return (
            <a ref={ref} href={url}>{label}</a>
        );
    },

    componentDidMount: function() {
        setTimeout(() => {
            this.repositionArrow();
        }, 100);
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
            var active = this.refs.activeLink;
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
            var active = this.refs.activeLink;
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

var emptyObject = { details: {} };
