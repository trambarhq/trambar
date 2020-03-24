import _ from 'lodash';
import React from 'react';
import { useProgress } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.js';
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
  const db = database.use({ by: this });
  const [ show ] = useProgress();

  // don't let the component be empty initially
  render();
  const currentUserID = await db.start();
  const project = await findCurrentProject(db);
  const users = await findProjectMembers(db, project);
  const roles = await findRolesOfUsers(db, users);
  render();

  function render() {
    show(
      <div className="role-filter-bar">
        {renderButtons()}
      </div>
    , 'initial');
  };

  function renderButtons() {
    if (roles.length > 0) {
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
      selected: roleIDsBefore.includes(role.id),
      env,
    };
    return <RoleFilterButton key={role.id} {...props} />;
  }
}

const findUsers = memoizeWeak(null, function(users, role) {
  let list = users.filter((user) => {
    return user.role_ids.includes(role.id);
  });
  if (list.length > 0) {
    return list;
  }
});
