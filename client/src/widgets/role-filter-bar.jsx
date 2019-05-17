import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';

// widgets
import RoleFilterButton from './role-filter-button.jsx';

import './role-filter-bar.scss';

/**
 * Asynchronous component that retrieve data needed by the role filter bar,
 * namely the list of roles and list of project members.
 *
 * @extends AsyncComponent
 */
class RoleFilterBar extends AsyncComponent {
    static displayName = 'RoleFilterBar';

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env, settings } = this.props;
        let db = database.use({ by: this });
        let props = {
            settings,
            route,
            env,
        };
        // don't let the component be empty initially
        meanwhile.show(<RoleFilterBarSync {...props} />, 'initial');
        let currentUserID = await db.start();
        props.project = await ProjectFinder.findCurrentProject(db);
        props.users = await UserFinder.findProjectMembers(db, props.project);
        props.roles = await RoleFinder.findRolesOfUsers(db, props.users);
        return <RoleFilterBarSync {...props} />;
    }
}

class RoleFilterBarSync extends PureComponent {
    static displayName = 'RoleFilterBarSync';

    /**
     * Render component
     *
     * @return {[type]}
     */
    render() {
        return (
            <div className="role-filter-bar">
                {this.renderButtons()}
            </div>
        );
    }

    /**
     * Render buttons
     *
     * @return {Array<ReactElement>|ReactElement}
     */
    renderButtons() {
        let { env, roles } = this.props;
        if (!_.isEmpty(roles)) {
            return _.map(roles, (role) => {
                return this.renderButton(role);
            });
        } else {
            // render a blank button to maintain spacing
            // show "No roles" if database query yielded nothing
            let props = {
                role: (roles !== null) ? null : undefined,
                env,
            };
            return <RoleFilterButton {...props} />;
        }
    }

    /**
     * Render button for given role
     *
     * @param  {Object} role
     *
     * @return {ReactElement}
     */
    renderButton(role) {
        let { route, env, users, settings } = this.props;
        let roleUsers = findUsers(users, role);
        let params = _.clone(settings.route || {});
        if (_.includes(route.params.roleIDs, role.id)) {
            params.roleIDs = _.without(route.params.roleIDs, role.id);
        } else {
            params.roleIDs = _.concat(route.params.roleIDs, role.id);
        }
        let url = route.find(route.name, params);
        let props = {
            role,
            users: roleUsers,
            url,
            selected: _.includes(route.params.roleIDs, role.id),
            env,
            onRoleClick: this.handleRoleClick,
        };
        return <RoleFilterButton key={role.id} {...props} />;
    }
}

const findUsers = memoizeWeak(null, function(users, role) {
    let list = _.filter(users, (user) => {
        return _.includes(user.role_ids, role.id);
    });
    if (!_.isEmpty(list)) {
        return list;
    }
});

export {
    RoleFilterBar as default,
    RoleFilterBar,
    RoleFilterBarSync,
};

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    RoleFilterBar.propTypes = {
        settings: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    RoleFilterBarSync.propTypes = {
        settings: PropTypes.object.isRequired,
        project: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
