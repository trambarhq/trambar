import _ from 'lodash';
import React from 'react';
import { useProgress, useListener } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.js';
import * as ProjectFinder from 'common/objects/finders/project-finder.js';
import * as UserFinder from 'common/objects/finders/user-finder.js';
import * as UserUtils from 'common/objects/utils/user-utils.js';

// widgets
import { ProfileImage } from '../widgets/profile-image.jsx';

import './user-selection-list.scss';

export async function UserSelectionList(props) {
  const { database, route, env, selection, disabled, onSelect } = props;
  const [ show ] = useProgress();

  const handleUserClick = useListener((evt) => {
    const userID = parseInt(evt.currentTarget.getAttribute('data-id'));
    const user = _.find(users, { id: userID });
    const userSelected = _.find(selection, { id: userID });
    let newSelection;
    if (userSelected) {
      newSelection = _.without(selection, userSelected);
    } else {
      newSelection = _.concat(selection, user);
    }
    if (onSelect) {
      onSelect({ selection: newSelection });
    }
  });

  render();
  const project = await ProjectFinder.findCurrentProject(database);
  const users = await UserFinder.findProjectMembers(database, project);
  render();

  function render() {
    const sorted = sortUsers(users, env);
    show(
      <div className="user-selection-list">
        {_.map(sorted, renderUser)}
      </div>
    );
  }

  function renderUser(user) {
    const props = {
      user,
      selected: _.some(selection, { id: user.id }),
      disabled: _.some(disabled, { id: user.id }),
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
  const name = UserUtils.getDisplayName(user, env);
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

const sortUsers = memoizeWeak(null, function(users, env) {
  let { p } = env.locale;
  let name = (user) => {
    return p(user.details.name);
  };
  return _.orderBy(users, [ name ], [ 'asc' ]);
});
