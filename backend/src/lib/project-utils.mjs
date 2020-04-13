import _ from 'lodash';

/**
 * Return the user's access level to a project
 *
 * @param  {Project} project
 * @param  {User} user
 *
 * @return {string|null}
 */
function getUserAccessLevel(project, user) {
  if (project && user) {
    if (!user.disabled) {
      if (user.type === 'admin' || _.includes(project.user_ids, user.id)) {
        if (!project.archived) {
          return 'read-write';
        } else {
          return 'read-only';
        }
      } else {
        if (_.get(project, 'settings.access_control.grant_view_access')) {
          if (!project.archived) {
            if (_.get(project, 'settings.access_control.grant_comment_access')) {
              return 'read-comment';
            } else {
              return 'read-only';
            }
          } else {
            return 'read-only';
          }
        }
      }
    }
  }
  return null;
}

/**
 * Return true if user can see a project (not necessarily its contents)
 *
 * @param  {Project}  project
 * @param  {User}  user
 *
 * @return {string}
 */
function isVisibleToUser(project, user) {
  let access = getUserAccessLevel(project, user);
  if (access) {
    return true;
  } else {
    // for non-members to request for membership, they need to know the
    // project exists in the first place
    if (user.type === 'guest') {
      if (_.get(project, 'settings.membership.allow_guest_request')) {
        return true;
      }
    } else {
      if (_.get(project, 'settings.membership.allow_user_request')) {
        return true;
      }
    }
    return false;
  }
}

function getWebsiteAddress(project) {
  if (!project) {
    return;
  }
  const { protocol, host } = location;
  const { domains } = project.settings;
  const { name } = project;
  if (!_.isEmpty(domains)) {
    return `${protocol}//${domains[0]}/`;
  } else {
    return `${protocol}//${host}/srv/www/${name}/`;
  }
}

export {
  isVisibleToUser,
  getUserAccessLevel,
  getWebsiteAddress,
};
