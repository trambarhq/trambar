import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as RepoFinder from 'objects/finders/repo-finder';
import * as RoleFinder from 'objects/finders/role-finder';
import * as ServerFinder from 'objects/finders/server-finder';
import * as UserFinder from 'objects/finders/user-finder';
import ComponentRefs from 'utils/component-refs';

// widgets
import CollapsibleContainer from 'widgets/collapsible-container';

import './navigation-tree.scss';

/**
 * Asynchronous component that retrieves data needed by the navigation tree.
 *
 * @extends AsyncComponent
 */
class NavigationTree extends AsyncComponent {
    static displayName = 'NavigationTree';

    async renderAsync(meanwhile) {
        let { database, route, env, disabled } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            project: undefined,
            user: undefined,
            role: undefined,
            repo: undefined,
            server: undefined,

            disabled,
            database,
            route,
            env,
        };
        if (!db.authorized) {
            return <NavigationTreeSync {...props} />;
        }
        meanwhile.show(<NavigationTreeSync {...props} />);
        let currentUserID = await db.start();
        let params = route.params;
        if (typeof(params.projectID) === 'number') {
            props.project = await ProjectFinder.findProject(db, params.projectID);
        }
        if (typeof(params.userID) === 'number') {
            props.user = await UserFinder.findUser(db, params.userID);
        }
        if (typeof(params.roleID) === 'number') {
            props.role = await RoleFinder.findRole(db, params.roleID);
        }
        if (typeof(params.repoID) === 'number') {
            props.repo = await RepoFinder.findRepo(db, params.repoID);
        }
        if (typeof(params.serverID) === 'number') {
            props.server = await ServerFinder.findServer(db, params.serverID);
        }
        return <NavigationTreeSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the navigation tree.
 *
 * @extends PureComponent
 */
class NavigationTreeSync extends PureComponent {
    static displayName = 'NavigationTreeSync';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            container: HTMLElement,
            arrow: HTMLElement,
        });
        this.state = {
            arrowPosition: -1,
            arrowCount: 0,
            arrowAction: '',
        };
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
        let { route, disabled } = this.props;
        let url;
        if (!disabled && node.page) {
            let params = _.omit(route.params, 'editing');
            url = route.find(node.page, params);
        }
        return (
            <div key={key} className={`level${level}`}>
                <a href={url}>{node.label}</a>
                {this.renderChildNodes(node, level + 1)}
            </div>
        );
    }

    renderChildNodes(node, level) {
        let children = _.filter(node.children);
        let open = !_.isEmpty(children);
        let contents;
        if (open) {
            contents = _.map(children, (childNode, i) => {
                return this.renderNode(childNode, level, i)
            });
        }
        return <CollapsibleContainer open={open}>{contents}</CollapsibleContainer>;
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
        let { route, env } = this.props;
        if (prevProps.route !== route || prevProps.env !== env) {
            this.repositionArrow();
        }
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
        ];
    }

    /**
     * Return nav node pointing to project list
     *
     * @return {Object}
     */
    getProjectListNode() {
        let { env } = this.props;
        let { t } = env.locale;
        let label = t('nav-projects');
        let page = 'project-list-page';
        let children = [
            this.getProjectNode(),
        ];
        return { label, page, children };
    }

    /**
     * Return nav node pointing to a project
     *
     * @return {Object}
     */
    getProjectNode() {
        let { route, env, project } = this.props;
        let { t, p } = env.locale;
        let page = 'project-summary-page';
        let label, children;
        if (project) {
            label = p(project.details.title) || project.name || '-';
            children = [
                this.getMemberListNode(),
                this.getRepoListNode(),
            ];
        } else if (route.params.projectID === 'new') {
            label = <i>{t('nav-project-new')}</i>;
        } else {
            return null;
        }
        return { label, page, children };
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
        let page = 'member-list-page';
        let children = [
            this.getMemberNode(),
        ];
        return { label, page, children };
    }

    /**
     * Return nav node pointing to a project member
     *
     * @return {Object}
     */
    getMemberNode() {
        let { route, env, user } = this.props;
        let { t, p } = env.locale;
        let page = 'member-summary-page';
        let label
        if (user) {
            label = p(user.details.name) || user.username || '-';
        } else if (route.params.userID === 'new') {
            label = <i>{t('nav-member-new')}</i>;
        } else {
            return null;
        }
        return { label, page };
    }

    /**
     * Return nav node pointing to project repo list
     *
     * @return {Object}
     */
    getRepoListNode() {
        let { route, env } = this.props;
        let { t } = env.locale;
        let page = 'repo-list-page';
        let label = t('nav-repositories');
        let children = [
            this.getRepoNode(),
        ];
        return { label, page, children };
    }

    /**
     * Return nav node pointing to a repo
     *
     * @return {Object}
     */
    getRepoNode() {
        let { route, env, repo } = this.props;
        let { t, p } = env.locale;
        let page = 'repo-summary-page';
        let label;
        if (repo) {
            label = p(repo.details.title) || repo.name || '-';
        } else {
            return null;
        }
        return { label, page };
    }

    /**
     * Return nav node pointing to user list
     *
     * @return {Object}
     */
    getUserListNode() {
        let { env } = this.props;
        let { t } = env.locale;
        let page = 'user-list-page';
        let label = t('nav-users');
        let children = [
            this.getUserNode(),
        ];
        return { label, page, children };
    }

    /**
     * Return nav node pointing to a user
     *
     * @return {Object}
     */
    getUserNode() {
        let { route, env, user, project } = this.props;
        let { t, p } = env.locale;
        let page = 'user-summary-page';
        let label;
        if (user && !project) {
            label = p(user.details.name) || user.username || '-';
        } else if (route.params.userID === 'new' && !project) {
            label = <i>{t('nav-user-new')}</i>;
        } else {
            return null;
        }
        return { label, page };
    }

    /**
     * Return nav node pointing to role list
     *
     * @return {Object}
     */
    getRoleListNode() {
        let { env } = this.props;
        let { t } = env.locale;
        let page = 'role-list-page';
        let label = t('nav-roles');
        let children = [
            this.getRoleNode(),
        ];
        return { label, page, children };
    }

    /**
     * Return nav node pointing to a role
     *
     * @return {Object}
     */
    getRoleNode() {
        let { route, env, role } = this.props;
        let { t, p } = env.locale;
        let page = 'role-summary-page';
        let label;
        if (role) {
            label = p(role.details.title) || role.name || '-';
        } else if (route.params.roleID === 'new') {
            label = <i>{t('nav-role-new')}</i>;
        } else {
            return null;
        }
        return { label, page };
    }

    /**
     * Return nav node pointing to server list
     *
     * @return {Object}
     */
    getServerListNode() {
        let { env } = this.props;
        let { t } = env.locale;
        let page = 'server-list-page';
        let label = t('nav-servers');
        let children = [
            this.getServerNode(),
        ];
        return { label, page, children };
    }

    /**
     * Return nav node pointing to a server
     *
     * @return {Object}
     */
    getServerNode() {
        let { route, env, server } = this.props;
        let { t, p } = env.locale;
        let page = 'server-summary-page';
        let label;
        if (server) {
            label = p(server.details.title);
            if (!label) {
                label = (server.type) ? t(`server-type-${server.type}`) : '-';
            }
        } else if (route.params.serverID === 'new') {
            label = <i>{t('nav-server-new')}</i>;
        } else {
            return null;
        }
        return { label, page };
    }

    /**
     * Return nav node pointing to settings page
     *
     * @return {Object}
     */
    getSettingsNode() {
        let { env } = this.props;
        let { t, p } = env.locale;
        let page = 'settings-page';
        let label = t('nav-settings');
        return { label, page };
    }

    /**
     * Move the arrow to the active link
     *
     * @return {Object}
     */
    repositionArrow() {
        let { route } = this.props;
        let { arrowCount } = this.state;
        let tries = 0;
        clearInterval(this.arrowRepositioningInterval);
        this.arrowRepositioningInterval = setInterval(() => {
            let { arrowPosition } = this.state;
            let { arrow, container } = this.components;
            if (!container) {
                // just in case something's wrong
                clearInterval(this.arrowRepositioningInterval);
                return;
            }
            let links = container.getElementsByTagName('A');
            let activeLink = _.find(links, (link) => {
                var url = route.url;
                var qi = url.indexOf('?');
                if (qi !== -1) {
                    url = url.substr(0, qi);
                }
                return url === link.getAttribute('href');
            });
            let level = getLinkLevel(activeLink);
            let action = '';
            if (level > arrowCount) {
                action = 'extending';
            } else if (level < arrowCount) {
                action = 'retracting';
            }

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
            if ((pos !== arrowPosition || arrowCount !== level) && tries < 20) {
                this.setState({ arrowPosition: pos, arrowAction: action, arrowCount: level });
                tries++;
            } else {
                clearInterval(this.arrowRepositioningInterval);
            }
        }, 50);
    }
}

function getLinkLevel(link) {
    for (let n = link; n; n = n.parentNode) {
        let m;
        if (m = /level(\d)/.exec(n.className)) {
            return parseInt(m[1]);
            break;
        }
    }
    return 0;
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
