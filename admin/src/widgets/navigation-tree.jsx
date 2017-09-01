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
        var db = this.props.database.use({ schema: 'global', by: this });
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
            // load objects needed for labels
            var params = this.props.route.parameters;
            var objectTypes = _.keys(_.pickBy(props, _.isNull));
            return Promise.each(objectTypes, (table) => {
                var id = parseInt(params[table + 'Id']);
                var schema = 'global';
                if (table === 'robot') {
                    if (!props.project) {
                        return;
                    }
                    schema = props.project.name;
                }
                if (id) {
                    var criteria = { id };
                    return db.findOne({ schema, table, criteria }).then((object) => {
                        props[table] = object;
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
        if (!node) {
            return;
        }
        var ref;
        if (this.isActive(node)) {
            ref = 'activeLink';
        }
        var subtree;
        return (
            <div key={key} className={`level${level}`}>
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

    /**
     * Return root-level nav nodes
     *
     * @return {Object}
     */
    getRootNodes: function() {
        return [
            this.getProjectListNode(),
            this.getUserListNode(),
            this.getRoleListNode(),
            this.getServerListNode(),
            this.getSettingsNode(),
        ]
    },

    /**
     * Return nav node pointing to project list
     *
     * @return {Object}
     */
    getProjectListNode: function() {
        var t = this.props.locale.translate;
        var label = t('nav-projects');
        var url = require('pages/project-list-page').getUrl();
        var children = [
            this.getProjectNode(),
        ];
        return { label, url, children };
    },

    /**
     * Return nav node pointing to a project
     *
     * @return {Object}
     */
    getProjectNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var project = this.state.project;
        var projectId = this.props.route.parameters.projectId;
        var label = (projectId === 'new')
                  ? <i>{t('nav-project-new')}</i>
                  : p(project.details.title) || project.name || '-';
        var url = (projectId)
                ? require('pages/project-summary-page').getUrl({ projectId })
                : null;
        var children = [
            this.getMemberListNode(),
            this.getRepoListNode(),
            this.getRobotListNode(),
        ];
        return { label, url, children, showChildren: (projectId !== 'new') };
    },

    /**
     * Return nav node pointing to project member list
     *
     * @return {Object}
     */
    getMemberListNode: function() {
        var t = this.props.locale.translate;
        var projectId = this.props.route.parameters.projectId;
        var label = t('nav-members');
        var url = (projectId)
                ? require('pages/member-list-page').getUrl({ projectId })
                : null;
        var children = [
            this.getMemberNode(),
        ];
        return { label, url, children };
    },

    /**
     * Return nav node pointing to a project member
     *
     * @return {Object}
     */
    getMemberNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var user = this.state.user;
        var userId = this.props.route.parameters.userId;
        var projectId = this.props.route.parameters.projectId;
        var label = (userId === 'new')
                  ? <i>{t('nav-member-new')}</i>
                  : p(user.details.name) || user.username || '-';
        var url = (projectId && userId)
                ? require('pages/user-summary-page').getUrl({ projectId, userId })
                : null;
        return { label, url };
    },

    /**
     * Return nav node pointing to project repo list
     *
     * @return {Object}
     */
    getRepoListNode: function() {
        var t = this.props.locale.translate;
        var projectId = this.props.route.parameters.projectId;
        var label = t('nav-repositories');
        var url = (projectId)
                ? require('pages/repo-list-page').getUrl({ projectId })
                : null;
        var children = [
            this.getRepoNode(),
        ];
        return { label, url, children };
    },

    /**
     * Return nav node pointing to a repo
     *
     * @return {Object}
     */
    getRepoNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var repo = this.state.repo;
        var repoId = this.props.route.parameters.repoId;
        var projectId = this.props.route.parameters.projectId;
        var label = p(repo.details.title) || repo.name || '-';
        var url = (projectId && repoId)
                ? require('pages/repo-summary-page').getUrl({ projectId, repoId })
                : null;
        return { label, url };
    },

    /**
     * Return nav node pointing to project robot list
     *
     * @return {Object}
     */
    getRobotListNode: function() {
        var t = this.props.locale.translate;
        var projectId = this.props.route.parameters.projectId;
        var label = t('nav-robots');
        var url = require('pages/robot-list-page').getUrl({ projectId });
        var children = [
            this.getRobotNode(),
        ];
        return { label, url, children };
    },

    /**
     * Return nav node pointing to a robot
     *
     * @return {Object}
     */
    getRobotNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var robot = this.state.robot;
        var robotId = this.props.route.parameters.robotId;
        var projectId = this.props.route.parameters.projectId;
        var label = (robotId === 'new')
                  ? <i>{t('nav-robot-new')}</i>
                  : p(robot.details.title) || robot.name || '-';
        var url = (projectId && robotId)
                ? require('pages/robot-summary-page').getUrl({ projectId, robotId })
                : null;
        return { label, url };
    },

    /**
     * Return nav node pointing to user list
     *
     * @return {Object}
     */
    getUserListNode: function() {
        var t = this.props.locale.translate;
        var label = t('nav-users');
        var url = require('pages/user-list-page').getUrl();
        var children = [
            this.getUserNode(),
        ];
        return { label, url, children };
    },

    /**
     * Return nav node pointing to a user
     *
     * @return {Object}
     */
    getUserNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var user = this.state.user;
        var userId = this.props.route.parameters.userId;
        var label = (userId === 'new')
                  ? <i>{t('nav-user-new')}</i>
                  : p(user.details.name) || user.username || '-';
        var url = (userId)
                ? require('pages/user-summary-page').getUrl({ userId })
                : null;
        return { label, url };
    },

    /**
     * Return nav node pointing to role list
     *
     * @return {Object}
     */
    getRoleListNode: function() {
        var t = this.props.locale.translate;
        var label = t('nav-roles');
        var url = require('pages/role-list-page').getUrl();
        var children = [
            this.getRoleNode(),
        ];
        return { label, url, children };
    },

    /**
     * Return nav node pointing to a role
     *
     * @return {Object}
     */
    getRoleNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var role = this.state.role;
        var roleId = this.props.route.parameters.roleId;
        var label = (roleId === 'new')
                  ? <i>{t('nav-role-new')}</i>
                  : p(role.details.title) || role.name || '-';
        var url = (roleId)
                ? require('pages/role-summary-page').getUrl({ roleId })
                : null;
        return { label, url };
    },

    /**
     * Return nav node pointing to server list
     *
     * @return {Object}
     */
    getServerListNode: function() {
        var t = this.props.locale.translate;
        var label = t('nav-servers');
        var url = require('pages/server-list-page').getUrl();
        var children = [
            this.getServerNode(),
        ];
        return { label, url, children };
    },

    /**
     * Return nav node pointing to a server
     *
     * @return {Object}
     */
    getServerNode: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var server = this.state.server;
        var serverId = this.props.route.parameters.serverId;
        var label = (serverId === 'new')
                  ? <i>{t('nav-server-new')}</i>
                  : p(server.details.title) || t(`server-type-${server.type}`);
        var url = (serverId)
                ? require('pages/server-summary-page').getUrl({ serverId })
                : null;
        return { label, url };
    },

    /**
     * Return nav node pointing to settings page
     *
     * @return {Object}
     */
    getSettingsNode: function() {
        var t = this.props.locale.translate;
        var label = t('nav-settings');
        var url = require('pages/settings-page').getUrl();
        return { label, url };
    },

    /**
     * Move the arrow to the active link
     *
     * @return {Object}
     */
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
            // happens in an interval function since the link will
            // move during transition
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
