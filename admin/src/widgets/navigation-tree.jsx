var _ = require('lodash');
var Promise = require('bluebird');
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
            repo: null,
            robot: null,
            server: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NavigationTreeSync {...props} />);
        return db.start().then((currentUserId) => {
            var params = this.props.route.parameters;
            var objectTypes = _.keys(_.pickBy(props, _.isNull));
            return Promise.map(objectTypes, (type) => {
                var id = parseInt(params[type + 'Id']);
                if (id) {
                    var criteria = { id };
                    return db.findOne({ table: type, criteria }).then((object) => {
                        props[type] = object;
                    });
                }
            });
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
        repo: PropTypes.object,
        robot: PropTypes.object,
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
            repo: this.props.repo || emptyObject,
            robot: this.props.robot || emptyObject,
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
        var keys = _.keys(this.state);
        var objects = _.pickBy(_.pick(nextProps, keys), Boolean);
        if (!_.isEmpty(objects)) {
            this.setState(objects);
        }
    },

    render: function() {
        var rootNodes = this.getRootNodes();
        return (
            <div ref="container" className="navigation-tree">
                {_.map(rootNodes, this.renderRootNode)}
                {this.renderArrow()}
            </div>
        );
    },

    renderRootNode: function(node, key) {
        return this.renderNode(node, 1, key);
    },

    renderNode: function(node, level, key) {
        var ref;
        if (this.isActive(node)) {
            ref = 'activeLink';
        }
        var subtree;
        return (
            <div className={`level${level}`}>
                <a ref={ref} href={node.url}>{node.label}</a>
                {this.renderChildNodes(node, level + 1)}
            </div>
        );
    },

    renderChildNodes: function(node, level) {
        if (_.isEmpty(node.children)) {
            return null;
        }
        var props = {
            open: node.showChildren || this.hasActiveChild(node),
            children: _.map(node.children, (childNode, i) => {
                return this.renderNode(childNode, level, i)
            })
        }
        return <CollapsibleContainer {...props} />;
    },

    renderArrow: function() {
        var numbers = [ 'zero', 'one', 'two', 'three', 'four' ];
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
                <i className="fa fa-play fourth" />
            </div>
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

    isActive: function(node) {
        return node.url === this.props.route.path;
    },

    hasActiveChild: function(node) {
        return _.some(node.children, (node) => {
            return this.isActive(node) || this.hasActiveChild(node);
        });
    },

    getRootNodes: function() {
        return [
            this.getProjectListNode(),
            this.getUserListNode(),
            this.getRoleListNode(),
            this.getServerListNode(),
            this.getSettingsNode(),
        ]
    },

    getProjectListNode: function() {
        var t = this.props.locale.translate;
        var label = t('nav-projects');
        var url = require('pages/project-list-page').getUrl();
        var children = [
            this.getProjectNode(),
        ];
        return { label, url, children };
    },

    getProjectNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var project = this.state.project;
        var projectId = this.props.route.parameters.projectId;
        var label = p(project.details.title) || project.name || t('nav-project-name-pending');
        var url = require('pages/project-summary-page').getUrl({ projectId });
        var children = [
            this.getMemberListNode(),
            this.getRepoListNode(),
            this.getRobotListNode(),
        ];
        return { label, url, children, showChildren: true };
    },

    getMemberListNode: function() {
        var t = this.props.locale.translate;
        var label = t('nav-members');
        var projectId = this.props.route.parameters.projectId;
        var url = require('pages/member-list-page').getUrl({ projectId });
        var children = [
            this.getMemberNode(),
        ];
        return { label, url, children };
    },

    getMemberNode: function() {
        var t = this.props.locale.translate;
        var user = this.state.user;
        var userId = this.props.route.parameters.userId;
        var projectId = this.props.route.parameters.projectId;
        var label = user.details.name || user.username || t('nav-user-name-pending');
        var url = require('pages/user-summary-page').getUrl({ projectId, userId });
        return { label, url };
    },

    getRepoListNode: function() {
        var t = this.props.locale.translate;
        var label = t('nav-repositories');
        var projectId = this.props.route.parameters.projectId;
        var url = require('pages/repo-list-page').getUrl({ projectId });
        var children = [
            this.getRepoNode(),
        ];
        return { label, url, children };
    },

    getRepoNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var repo = this.state.repo;
        var repoId = this.props.route.parameters.repoId;
        var projectId = this.props.route.parameters.projectId;
        var label = p(repo.details.title) || repo.name || t('nav-repo-name-pending');
        var url = require('pages/repo-summary-page').getUrl({ projectId, repoId });
        return { label, url };
    },

    getRobotListNode: function() {
        var t = this.props.locale.translate;
        var label = t('nav-robots');
        var projectId = this.props.route.parameters.projectId;
        var url = require('pages/robot-list-page').getUrl({ projectId });
        var children = [
            this.getRobotNode(),
        ];
        return { label, url, children };
    },

    getRobotNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var robot = this.state.robot;
        var robotId = this.props.route.parameters.robotId;
        var projectId = this.props.route.parameters.projectId;
        var label = p(robot.details.title) || robot.name || t('nav-robot-name-pending');
        var url = require('pages/robot-summary-page').getUrl({ projectId, robotId });
        return { label, url };
    },

    getUserListNode: function() {
        var t = this.props.locale.translate;
        var url = require('pages/user-list-page').getUrl();
        var label = t('nav-users');
        var children = [
            this.getUserNode(),
        ];
        return { label, url, children };
    },

    getUserNode: function() {
        var t = this.props.locale.translate;
        var user = this.state.user;
        var label = user.details.name || user.username || t('nav-user-name-pending');
        var userId = this.props.route.parameters.userId;
        var url = require('pages/user-summary-page').getUrl({ userId });
        return { label, url };
    },

    getRoleListNode: function() {
        var t = this.props.locale.translate;
        var url = require('pages/role-list-page').getUrl();
        var label = t('nav-roles');
        var children = [
            this.getRoleNode(),
        ];
        return { label, url, children };
    },

    getRoleNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var role = this.state.role;
        var label = p(role.details.tile) || role.name || t('nav-role-name-pending');
        var roleId = this.props.route.parameters.roleId;
        var url = require('pages/role-summary-page').getUrl({ roleId });
        return { label, url };
    },

    getServerListNode: function() {
        var t = this.props.locale.translate;
        var url = require('pages/server-list-page').getUrl();
        var label = t('nav-servers');
        var children = [
            this.getServerNode(),
        ];
        return { label, url, children };
    },

    getServerNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var server = this.state.server;
        var label = p(server.details.tile) || server.name || t('nav-server-name-pending');
        var serverId = this.props.route.parameters.serverId;
        var url = require('pages/server-summary-page').getUrl({ serverId });
        return { label, url };
    },

    getSettingsNode: function() {
        var t = this.props.locale.translate;
        var url = require('pages/settings-page').getUrl();
        var label = t('nav-servers');
        return { label, url };
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
