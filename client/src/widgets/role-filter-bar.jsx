import React from 'react';
import { useProgress } from 'relaks';
import { findCurrentProject } from 'common/objects/finders/project-finder.js';
import { findRolesOfUsers } from 'common/objects/finders/role-finder.js';
import { findProjectMembers } from 'common/objects/finders/user-finder.js';

// widgets
import { RoleFilterButton } from './role-filter-button.jsx';

import './role-filter-bar.scss';

/**
 * Asynchronous component that retrieve data needed by the role filter bar,
 * namely the list of roles and list of project members.
 */
export async function RoleFilterBar(props) {
  const { database, route, env, settings } = props;
  const [ show ] = useProgress();

  // don't let the component be empty initially
  render('initial');
  const currentUserID = await database.start();
  const project = await findCurrentProject(database);
  const users = await findProjectMembers(database, project);
  const roles = await findRolesOfUsers(database, users);
  render();

  function render(disp) {
    show(
      <div className="role-filter-bar">
        {renderButtons()}
      </div>
    , disp);
  };

  function renderButtons() {
    if (roles.length > 0) {
      return roles.map(renderButton);
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
    const roleUsers = users?.filter(usr => usr.role_ids.includes(role.id));
    const roleIDs = toggle(roleIDsBefore, role.id);
    const params = { ...settings.route, roleIDs };
    const url = route.find(route.name, params);
    const props = {
      role,
      users: roleUsers,
      url,
      selected: roleIDsBefore.includes(role.id),
      env,
    };
    return <RoleFilterButton key={role.id} {...props} />;
  }
}
