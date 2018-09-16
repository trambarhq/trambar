import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Memoize from 'utils/memoize';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as RoleFinder from 'objects/finders/role-finder';
import * as UserFinder from 'objects/finders/user-finder';

// widgets
import RoleFilterButton from 'widgets/role-filter-button';

import './role-filter-bar.scss';

class RoleFilterBar extends AsyncComponent {
    static displayName = 'RoleFilterBar';

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        let props = {
            roles: null,
            users: null,
            project: null,

            settings: this.props.settings,
            locale: this.props.locale,
            route: this.props.route,
            theme: this.props.theme,
        };
        meanwhile.show(<RoleFilterBarSync {...props} />);
        return db.start().then((userId) => {
            return ProjectFinder.findCurrentProject(db).then((project) => {
                props.project = project;
            });
        }).then(() => {
            return UserFinder.findProjectMembers(db, props.project).then((users) => {
                props.users = users;
            });
        }).then(() => {
            return RoleFinder.findRolesOfUsers(db, props.users).then((roles) => {
                props.roles = roles;
            });
        }).then((roles) => {
            return <RoleFilterBarSync {...props} />;
        });
    }
}

class RoleFilterBarSync extends PureComponent {
    static displayName = 'RoleFilterBar.Sync';

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
        let roles = this.props.roles;
        if (!_.isEmpty(roles)) {
            return _.map(roles, this.renderButton);
        } else {
            // render a blank button to maintain spacing
            // show "No roles" if database query yielded nothing
            let props = {
                role: (roles !== null) ? null : undefined,
                locale: this.props.locale,
                theme: this.props.theme,
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
        let users = findUsers(this.props.users, role);
        let route = this.props.route;
        let roleIds = route.parameters.roles;
        let params = _.clone(this.props.settings.route);
        if (_.includes(roleIds, role.id)) {
            params.roles = _.without(roleIds, role.id);
        } else {
            params.roles = _.concat(roleIds, role.id);
        }
        let url = route.find(route.component, params);
        let props = {
            role,
            users,
            url,
            locale: this.props.locale,
            theme: this.props.theme,
            selected: _.includes(roleIds, role.id),
            onRoleClick: this.handleRoleClick,
        };
        return <RoleFilterButton key={role.id} {...props} />;
    }
}

let findUsers = Memoize(function(users, role) {
    let list = _.filter(users, (user) => {
        return _.includes(user.role_ids, role.id);
    });
    if (!_.isEmpty(list)) {
        return list;
    }
    return list;
});

export {
    RoleFilterBar as default,
    RoleFilterBarSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

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
