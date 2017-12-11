var _ = require('lodash');

exports.default = {
};

if (process.env.NODE_ENV !== 'production') {
    exports.typedef = {
        membership: {
            allow_user_request: Boolean,
            approve_user_request: Boolean,
            allow_guest_request: Boolean,
            approve_guest_request: Boolean,
        },
        access_control: {
            grant_view_access: Boolean,
            grant_comment_access: Boolean,
        },
    }
}

exports.isVisibleToUser = isVisibleToUser;
exports.getUserAccessLevel = getUserAccessLevel;

/**
 * Return the user's access level, assuming complete lack of access would
 * trigger error
 *
 * @param  {Project} project
 * @param  {User} user
 *
 * @return {String}
 */
function getAccessLevel(project, user) {
    if (project && user) {
        if (!user.disabled) {
            if (_.includes(project.user_ids, user.id)) {
                return 'read-write';
            } else {
                var commentAccess = _.get(project, 'settings.access_control.grant_comment_access', false);
                var viewAccess = _.get(project, 'settings.access_control.grant_view_access', false);
                if (viewAccess && commentAccess) {
                    return 'read-comment';
                }
            }
        }
    }
    return 'read-only';
}

/**
 * Return the user's access level, assuming complete lack of access would
 * trigger error
 *
 * @param  {Project} project
 * @param  {User} user
 *
 * @return {String|null}
 */
function getUserAccessLevel(project, user) {
    if (project && user) {
        if (!user.disabled) {
            if (_.includes(project.user_ids, user.id)) {
                return 'read-write';
            } else {
                if (_.get(project, 'settings.access_control.grant_view_access')) {
                    if (_.get(project, 'settings.access_control.grant_comment_access')) {
                        return 'read-comment';
                    } else {
                        return 'read-only'
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
 * @return {String}
 */
function isVisibleToUser(project, user) {
    var access = getUserAccessLevel(project, user);
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
