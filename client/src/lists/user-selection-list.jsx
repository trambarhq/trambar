import React from 'react';
import { useProgress, useListener } from 'relaks';
import { findCurrentProject } from 'common/objects/finders/project-finder.js';
import { findProjectMembers } from 'common/objects/finders/user-finder.js';
import { getUserName } from 'common/objects/utils/user-utils.js';

// widgets
import { ProfileImage } from '../widgets/profile-image.jsx';

import './user-selection-list.scss';

export async function UserSelectionList(props) {
  const { database, route, env, selection, disabled, onSelect } = props;
  const [ show ] = useProgress();

  const handleUserClick = useListener((evt) => {
    const userID = parseInt(evt.currentTarget.getAttribute('data-id'));
    const user = users.find(usr => usr.id === userID);
    const userSelectedIndex = selection.findIndex(usr => usr.id === userID);
    const newSelection = [ ...selection ];
    if (userSelectedIndex !== -1) {
      newSelection.splice(userSelectedIndex, 1);
    } else {
      newSelection.push(user);
    }
    if (onSelect) {
      onSelect({ selection: newSelection });
    }
  });

  render();
  const project = await findCurrentProject(database);
  const users = await findProjectMembers(database, project);
  render();

  function render() {
    const sorted = sortUsers(users, env);
    show(
      <div className="user-selection-list">
        {sorted.map(renderUser)}
      </div>
    );
  }

  function renderUser(user) {
    const props = {
      user,
      selected: selection.some(u => u.id === user.id),
      disabled: disabled.some(u => u.id === user.id),
      env,
      onClick: handleUserClick,
    };
    return <User key={user.id} {...props} />
  }
}

function User(props) {
  const { user, env, disabled, onClick } = props;
  const classNames = [ 'user' ];
  if (props.selected) {
    classNames.push('selected');
  }
  if (props.disabled) {
    classNames.push('disabled');
  }
  const name = getUserName(user, env);
  let containerProps = {
    className: classNames.join(' '),
    'data-id': user.id,
    onClick: !disabled ? onClick : null,
  };
  const imageProps = { user, env, size: 'small' };
  return (
    <div {...containerProps}>
      <ProfileImage {...imageProps} />
      <span className="name">{name}</span>
      <i className="fas fa-check-circle" />
    </div>
  );
}

function sortUsers(users, env) {
  const name = u => getUserName(u, env);
  return orderBy(users, [ name ], [ 'asc' ]);
}
