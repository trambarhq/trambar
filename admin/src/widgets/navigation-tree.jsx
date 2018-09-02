var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var ProjectFinder = require('objects/finders/project-finder');
var RepoFinder = require('objects/finders/repo-finder');
var RoleFinder = require('objects/finders/role-finder');
var ServerFinder = require('objects/finders/server-finder');
var UserFinder = require('objects/finders/user-finder');
var ComponentRefs = require('utils/component-refs');

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
        disabled: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            project: null,
            user: null,
            role: null,
            repo: null,
            server: null,

            disabled: this.props.disabled,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NavigationTreeSync {...props} />);
        return db.start().then((currentUserId) => {
            var promises = {};
            if (typeof(params.project) === 'number') {
                promises.project = ProjectFinder.findProject(db, params.project);
            }
            if (typeof(params.user) === 'number') {
                promises.user = UserFinder.findUser(db, params.user);
            }
            if (typeof(params.role) === 'number') {
                promises.role = RoleFinder.findRole(db, params.role);
            }
            if (typeof(params.repo) === 'number') {
                promises.repo = RepoFinder.findRepo(db, params.repo);
            }
            if (typeof(params.server) === 'number') {
                promises.server = ServerFinder.findServer(db, params.server);
            }
            return Promise.props(promises).then((objects) => {
                _.assign(props, objects);
            }).catch((err) => {
            });
        }).then(() => {
            return <NavigationTreeSync {...props} />;
        }).catch((err) => {
            if (err.statusCode === 401) {
                // render the component even when we don't have access yet
                // --for appearance sake
                return <NavigationTreeSync {...props} />;
            } else {
                throw err;
            }
        });
    },
});

var NavigationTreeSync = module.exports.Sync = React.createClass({
    displayName: 'NavigationTree.Sync',
    propTypes: {
        disabled: PropTypes.bool,
        project: PropTypes.object,
        user: PropTypes.object,
        role: PropTypes.object,
        repo: PropTypes.object,
        server: PropTypes.object,

        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        this.components = ComponentRefs({
            activeLink: HTMLAnchorElement,
            container: HTMLElement,
            arrow: HTMLElement,
        });
        return {
            arrowPosition: 0,
            arrowCount: 0,
            arrowAction: '',

            project: this.props.project || emptyObject,
            user: this.props.user || emptyObject,
            role: this.props.role || emptyObject,
            repo: this.props.repo || emptyObject,
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
        var setters = this.components.setters;
        var classNames = [ 'navigation-tree' ];
        if (this.props.disabled) {
            classNames.push('disabled');
        }
        var rootNodes = this.getRootNodes();
        return (
            <div ref={setters.container} className={classNames.join(' ')}>
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
            ref = this.components.setters.activeLink;
        }
        var url;
        if (!this.props.disabled) {
            url = node.url
        }
        var subtree;
        return (
            <div key={key} className={`level${level}`}>
                <a ref={ref} href={url}>{node.label}</a>
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
            ref: this.components.setters.arrow,
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
        var route = this.props.route;
        var label = t('nav-projects');
        var url = route.find('project-list-page');
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
        var route = this.props.route;
        var params = route.parameters;
        var project = this.state.project;
        var label;
        if (params.project === 'new') {
            label = <i>{t('nav-project-new')}</i>;
        } else {
            label = p(project.details.title) || project.name || '-';
        }
        var url = route.find('project-summary-page', {
            project: params.project
        });
        // show children when there's actually a project
        var showChildren = (typeof(params.project) === 'number');
        var children = [
            this.getMemberListNode(),
            this.getRepoListNode(),
        ];
        return { label, url, children, showChildren };
    },

    /**
     * Return nav node pointing to project member list
     *
     * @return {Object}
     */
    getMemberListNode: function() {
        var t = this.props.locale.translate;
        var route = this.props.route;
        var params = route.parameters;
        var label = t('nav-members');
        var url;
        if (typeof(params.project) === 'number') {
            url = route.find('member-list-page', {
                project: params.project
            });
        }
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
        var route = this.props.route;
        var params = route.parameters;
        var user = this.state.user;
        var label, url;
        if (params.user === 'new') {
            label = <i>{t('nav-member-new')}</i>;
        } else {
            label = p(user.details.name) || user.username || '-';
        }
        if (typeof(params.project) === 'number') {
            url = route.find('user-summary-page', {
                project: params.project,
                user: params.user,
            });
        }
        return { label, url };
    },

    /**
     * Return nav node pointing to project repo list
     *
     * @return {Object}
     */
    getRepoListNode: function() {
        var t = this.props.locale.translate;
        var route = this.props.route;
        var params = route.parameters;
        var label = t('nav-repositories');
        var url;
        if (typeof(params.project) === 'number') {
            url = route.find('repo-list-page', {
                project: params.project
            });
        }
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
        var route = this.props.route;
        var params = route.parameters;
        var repo = this.state.repo;
        var label = p(repo.details.title) || repo.name || '-';
        var url;
        if (params.project && params.repo) {
            url = route.find('repo-summary-page', {
                project: params.project,
                repo: params.repo,
            });
        }
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
        var route = this.props.route;
        var url = route.find('user-list-page');
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
        var route = this.props.route;
        var params = route.parameters;
        var user = this.state.user;
        var label, url;
        if (params.user === 'new') {
            label = <i>{t('nav-user-new')}</i>;
        } else {
            label = p(user.details.name) || user.username || '-';
        }
        if (params.user) {
            url = route.find('user-summary-page', {
                user: params.user
            });
        }
        return { label, url };
    },

    /**
     * Return nav node pointing to role list
     *
     * @return {Object}
     */
    getRoleListNode: function() {
        var t = this.props.locale.translate;
        var route = this.props.route;
        var label = t('nav-roles');
        var url = route.find('role-list-page');
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
        var route = this.props.route;
        var params = route.parameters;
        var role = this.state.role;
        var label, url;
        if (params.role === 'new') {
            label = <i>{t('nav-role-new')}</i>;
        } else {
            label = p(role.details.title) || role.name || '-';
        }
        if (params.role) {
            url = route.find('role-summary-page', {
                role: params.role
            });
        }
        return { label, url };
    },

    /**
     * Return nav node pointing to server list
     *
     * @return {Object}
     */
    getServerListNode: function() {
        var t = this.props.locale.translate;
        var route = this.props.route;
        var label = t('nav-servers');
        var url = route.find('server-list-page');
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
        var route = this.props.route;
        var params = route.parameters;
        var server = this.state.server;
        var label, url;
        if (params.server === 'new') {
            label = <i>{t('nav-server-new')}</i>;
        } else {
            label = p(server.details.title);
            if (!label) {
                label = (server.type) ? t(`server-type-${server.type}`) : '-';
            }
        }
        if (params.server) {
            url = route.find('server-summary-page', {
                server: params.server
            });
        }
        return { label, url };
    },

    /**
     * Return nav node pointing to settings page
     *
     * @return {Object}
     */
    getSettingsNode: function() {
        var t = this.props.locale.translate;
        var route = this.props.route;
        var label = t('nav-settings');
        var url = route.find('settings-page');
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
            var active = this.components.activeLink;
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

        var arrow = this.components.arrow;
        var container = this.components.container;
        var interval = setInterval(() => {
            // calculate the position of the arrow
            // happens in an interval function since the link will
            // move during transition
            var pos = 0;
            var active = this.components.activeLink;
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
