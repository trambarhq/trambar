import _ from 'lodash';
import React from 'react';
import Relaks, { useProgress } from 'relaks';
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
 */
async function RoleFilterBar(props) {
    const { database, route, env, settings } = props;
    const db = database.use({ by: this });
    const [ show ] = useProgress();

    // don't let the component be empty initially
    render();
    const currentUserID = await db.start();
    const project = await ProjectFinder.findCurrentProject(db);
    const users = await UserFinder.findProjectMembers(db, project);
    const roles = await RoleFinder.findRolesOfUsers(db, users);
    render();

    function render() {
        show(
            <div className="role-filter-bar">
                {renderButtons()}
            </div>
        , 'initial');
    };

    function renderButtons() {
        if (!_.isEmpty(roles)) {
            return _.map(roles, renderButton);
        } else if (roles) {
            const props = {
                role: (roles !== null) ? null : undefined,
                env,
            };
            return <RoleFilterButton {...props} />;
        }
    }

    function renderButton(role) {
        const roleIDsBefore = route.params.roleIDs;
        const roleUsers = findUsers(users, role);
        const roleIDs = _.toggle(roleIDsBefore, role.id);
        const params = { ...settings.route, roleIDs };
        const url = route.find(route.name, params);
        const props = {
            role,
            users: roleUsers,
            url,
            selected: _.includes(roleIDsBefore, role.id),
            env,
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

const component = Relaks.memo(RoleFilterBar);

export {
    component as default,
    component as RoleFilterBar,
};
