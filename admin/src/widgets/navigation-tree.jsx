import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'react';
import ProjectFinder from 'objects/finders/project-finder';
import RepoFinder from 'objects/finders/repo-finder';
import RoleFinder from 'objects/finders/role-finder';
import ServerFinder from 'objects/finders/server-finder';
import UserFinder from 'objects/finders/user-finder';
import ComponentRefs from 'utils/component-refs';

// widgets
import CollapsibleContainer from 'widgets/collapsible-container';

import './navigation-tree.scss';

class NavigationTree extends AsyncComponent {
    static displayName = 'NavigationTree';

    renderAsync(meanwhile) {
        let { database, route, env, disabled } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            project: null,
            user: null,
            role: null,
            repo: null,
            server: null,

            disabled,
            database,
            route,
            env,
        };
        meanwhile.show(<NavigationTreeSync {...props} />);
        return db.start().then((currentUserID) => {
            let params = route.params;
            let promises = {};
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
    }
});

class NavigationTreeSync extends PureComponent {
    static displayName = 'NavigationTree.Sync';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            activeLink: HTMLAnchorElement,
            container: HTMLElement,
            arrow: HTMLElement,
        });
        this.state = {
            arrowPosition: 0,
            arrowCount: 0,
            arrowAction: '',

            project: props.project || emptyObject,
            user: props.user || emptyObject,
            role: props.role || emptyObject,
            repo: props.repo || emptyObject,
            server: props.server || emptyObject,
        };
    }

    /**
     * Save copies of objects so we can still render their names while
     * the section is collapsing
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let keys = _.keys(this.state);
        let objects = _.pickBy(_.pick(nextProps, keys), Boolean);
        if (!_.isEmpty(objects)) {
            this.setState(objects);
        }
    }

    render() {
        let { disabled } = this.props;
        let { setters } = this.components;
        let classNames = [ 'navigation-tree' ];
        if (disabled) {
            classNames.push('disabled');
        }
        let rootNodes = this.getRootNodes();
        return (
            <div ref={setters.container} className={classNames.join(' ')}>
                {
                    _.map(rootNodes, (node, key) => {
                        return this.renderNode(node, 1, key);
                    })
                }
                {this.renderArrow()}
            </div>
        );
    }

    renderNode(node, level, key) {
        let { disabled } = this.props;
        let { setters } = this.components;
        if (!node) {
            return;
        }
        let ref;
        if (this.isActive(node)) {
            ref = setters.activeLink;
        }
        let url = (!disabled) ? node.url : undefined;
        let subtree;
        return (
            <div key={key} className={`level${level}`}>
                <a ref={ref} href={url}>{node.label}</a>
                {this.renderChildNodes(node, level + 1)}
            </div>
        );
    }

    renderChildNodes(node, level) {
        if (_.isEmpty(node.children)) {
            return null;
        }
        let props = {
            open: node.showChildren || this.hasActiveChild(node),
            children: _.map(node.children, (childNode, i) => {
                return this.renderNode(childNode, level, i)
            })
        }
        return <CollapsibleContainer {...props} />;
    }

    renderArrow() {
        let { arrowPosition, arrowCount, arrowAction } = this.state;
        let { setters } = this.components;
        let numbers = [ 'zero', 'one', 'two', 'three', 'four' ];
        let arrowProps = {
            ref: setters.arrow,
            className: `arrow ${numbers[arrowCount]} ${arrowAction}`,
            style: { top: arrowPosition },
        };
        return (
            <div {...arrowProps}>
                <i className="fa fa-play first" />
                <i className="fa fa-play second" />
                <i className="fa fa-play third" />
                <i className="fa fa-play fourth" />
            </div>
        );
    }

    componentDidMount() {
        setTimeout(() => {
            this.repositionArrow();
        }, 100);
    }

    componentDidUpdate(prevProps, prevState) {
        let { route } = this.props;
        if (prevProps.route !== route) {
            this.repositionArrow();
        }
    }

    isActive(node) {
        let { route } = this.props;
        return node.url === route.path;
    }

    hasActiveChild(node) {
        return _.some(node.children, (node) => {
            return this.isActive(node) || this.hasActiveChild(node);
        });
    }

    /**
     * Return root-level nav nodes
     *
     * @return {Object}
     */
    getRootNodes() {
        return [
            this.getProjectListNode(),
            this.getUserListNode(),
            this.getRoleListNode(),
            this.getServerListNode(),
            this.getSettingsNode(),
        ]
    }

    /**
     * Return nav node pointing to project list
     *
     * @return {Object}
     */
    getProjectListNode() {
        let { route, env } = this.props;
        let { t } = env.locale;
        let label = t('nav-projects');
        let url = route.find('project-list-page');
        let children = [
            this.getProjectNode(),
        ];
        return { label, url, children };
    }

    /**
     * Return nav node pointing to a project
     *
     * @return {Object}
     */
    getProjectNode() {
        let { route, env } = this.props;
        let { project } = this.state;
        let { t, p } = env.locale;
        let label;
        if (route.params.project === 'new') {
            label = <i>{t('nav-project-new')}</i>;
        } else {
            label = p(project.details.title) || project.name || '-';
        }
        let url = route.find('project-summary-page', route.params);
        // show children when there's actually a project
        let showChildren = (typeof(route.params.project) === 'number');
        let children = [
            this.getMemberListNode(),
            this.getRepoListNode(),
        ];
        return { label, url, children, showChildren };
    }

    /**
     * Return nav node pointing to project member list
     *
     * @return {Object}
     */
    getMemberListNode() {
        let { route, env } = this.props;
        let { t } = env.locale;
        let label = t('nav-members');
        let url;
        if (typeof(route.params.project) === 'number') {
            url = route.find('member-list-page', {
                project: route.params.project
            });
        }
        let children = [
            this.getMemberNode(),
        ];
        return { label, url, children };
    }

    /**
     * Return nav node pointing to a project member
     *
     * @return {Object}
     */
    getMemberNode() {
        let { route, env } = this.props;
        let { user } = this.state;
        let { t, p } = env.locale;
        let label, url;
        if (route.params.user === 'new') {
            label = <i>{t('nav-member-new')}</i>;
        } else {
            label = p(user.details.name) || user.username || '-';
        }
        if (route.params.project && route.params.user) {
            url = route.find('user-summary-page', route.params);
        }
        return { label, url };
    }

    /**
     * Return nav node pointing to project repo list
     *
     * @return {Object}
     */
    getRepoListNode() {
        let { route, env } = this.props;
        let { t } = env.locale;
        let label = t('nav-repositories');
        let url;
        if (typeof(route.params.project) === 'number') {
            url = route.find('repo-list-page', {
                project: route.params.project
            });
        }
        let children = [
            this.getRepoNode(),
        ];
        return { label, url, children };
    }

    /**
     * Return nav node pointing to a repo
     *
     * @return {Object}
     */
    getRepoNode() {
        let { route, env } = this.props;
        let { repo } = this.state;
        let { t, p } = env.locale;
        let label = p(repo.details.title) || repo.name || '-';
        let url;
        if (route.params.project && route.params.repo) {
            url = route.find('repo-summary-page', route.params);
        }
        return { label, url };
    }

    /**
     * Return nav node pointing to user list
     *
     * @return {Object}
     */
    getUserListNode() {
        let { route, env } = this.props;
        let { t } = env.locale;
        let label = t('nav-users');
        let url = route.find('user-list-page');
        let children = [
            this.getUserNode(),
        ];
        return { label, url, children };
    }

    /**
     * Return nav node pointing to a user
     *
     * @return {Object}
     */
    getUserNode() {
        let { route, env } = this.props;
        let { user } = this.state;
        let { t, p } = env.locale;
        let label, url;
        if (route.params.user === 'new') {
            label = <i>{t('nav-user-new')}</i>;
        } else {
            label = p(user.details.name) || user.username || '-';
        }
        if (route.params.user) {
            url = route.find('user-summary-page', route.params);
        }
        return { label, url };
    }

    /**
     * Return nav node pointing to role list
     *
     * @return {Object}
     */
    getRoleListNode() {
        let { route, env } = this.props;
        let { t } = env.locale;
        let label = t('nav-roles');
        let url = route.find('role-list-page');
        let children = [
            this.getRoleNode(),
        ];
        return { label, url, children };
    }

    /**
     * Return nav node pointing to a role
     *
     * @return {Object}
     */
    getRoleNode() {
        let { route, env } = this.props;
        let { role } = this.state;
        let { t, p } = env.locale;
        let label, url;
        if (route.params.role === 'new') {
            label = <i>{t('nav-role-new')}</i>;
        } else {
            label = p(role.details.title) || role.name || '-';
        }
        if (route.params.role) {
            url = route.find('role-summary-page', route.params);
        }
        return { label, url };
    }

    /**
     * Return nav node pointing to server list
     *
     * @return {Object}
     */
    getServerListNode() {
        let { route, env } = this.props;
        let { t } = env.locale;
        let label = t('nav-servers');
        let url = route.find('server-list-page');
        let children = [
            this.getServerNode(),
        ];
        return { label, url, children };
    }

    /**
     * Return nav node pointing to a server
     *
     * @return {Object}
     */
    getServerNode() {
        let { route, env } = this.props;
        let { server } = this.state;
        let { t, p } = env.locale;
        let label, url;
        if (route.params.server === 'new') {
            label = <i>{t('nav-server-new')}</i>;
        } else {
            label = p(server.details.title);
            if (!label) {
                label = (server.type) ? t(`server-type-${server.type}`) : '-';
            }
        }
        if (route.params.server) {
            url = route.find('server-summary-page', route.params);
        }
        return { label, url };
    }

    /**
     * Return nav node pointing to settings page
     *
     * @return {Object}
     */
    getSettingsNode() {
        let { route, env } = this.props;
        let { t, p } = env.locale;
        let label = t('nav-settings');
        let url = route.find('settings-page');
        return { label, url };
    }

    /**
     * Move the arrow to the active link
     *
     * @return {Object}
     */
    repositionArrow() {
        setTimeout(() => {
            let { arrowCount } = this.state;
            let { activeLink } = this.components;
            // find the link level
            let level = 0;
            if (activeLink) {
                for (let n = activeLink; n; n = n.parentNode) {
                    let m;
                    if (m = /level(\d)/.exec(n.className)) {
                        level = parseInt(m[1]);
                        break;
                    }
                }
            }

            let action = '';
            if (level > arrowCount) {
                action = 'extending';
            } else if (level < arrowCount) {
                action = 'retracting';
            }
            this.setState({ arrowAction: action, arrowCount: level })
        }, 50);

        let interval = setInterval(() => {
            let { arrowPosition } = this.state;
            let { arrow, container, activeLink } = this.components;
            // calculate the position of the arrow
            // happens in an interval function since the link will
            // move during transition
            let pos = 0;
            if (activeLink) {
                let arrowRect = arrow.getBoundingClientRect();
                let linkRect = activeLink.getBoundingClientRect();
                let containerRect = container.getBoundingClientRect();
                pos = Math.floor(linkRect.top + ((linkRect.height - arrowRect.height) / 2) - containerRect.top) + 1;
            }
            if (pos !== arrowPosition) {
                this.setState({ arrowPosition: pos });
            } else {
                clearInterval(interval);
            }
        }, 50);
    }
}

const emptyObject = { details: {} };

export {
    NavigationTree as default,
    NavigationTree,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NavigationTree.propTypes = {
        disabled: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    NavigationTreeSync.propTypes = {
        project: PropTypes.object,
        user: PropTypes.object,
        role: PropTypes.object,
        repo: PropTypes.object,
        server: PropTypes.object,

        disabled: PropTypes.bool,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
