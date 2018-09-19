import _ from 'lodash';
import Moment from 'moment';
import { mergeRemoteChanges } from 'objects/utils/story-utils';
import ReactionUtils from 'objects/utils/reaction-utils';
import {
    GitNotificationTypes,
    AdminNotificationTypes,
    MembershipNotificationTypes
} from 'objects/types/notification-types';

/**
 * Return true if user is a member of the project
 *
 * @param  {User} user
 * @param  {Project} project
 *
 * @return {Boolean}
 */
function isMember(user, project) {
    if (!user || !project) {
        return false;
    }
    return _.includes(project.user_ids, user.id);
}

/**
 * Return true if user has requested project membership
 *
 * @param  {User} user
 * @param  {Project} project
 *
 * @return {Boolean}
 */
function isPendingMember(user, project) {
    if (!user || !project) {
        return false;
    }
    return _.includes(user.requested_project_ids, project.id);
}

/**
 * Return true if user has read access to project
 *
 * @param  {User} user
 * @param  {Project} project
 *
 * @return {Boolean}
 */
function canViewProject(user, project) {
    if (isMember(user, project)) {
        return true;
    } else {
        if (!user || !project) {
            return false;
        }
        if (user.type === 'admin') {
            return true;
        } else {
            return _.get(project, 'settings.access_control.grant_view_access', false);
        }
    }
    return false;
}

/**
 * Return true if user can join a project
 *
 * @param  {User} user
 * @param  {Project} project
 *
 * @return {Boolean}
 */
function canJoinProject(user, project) {
    if (!user || !project) {
        return false;
    }
    if (user.type === 'guest') {
        return _.get(project, 'settings.membership.allow_guest_request', false);
    } else {
        return _.get(project, 'settings.membership.allow_user_request', false);
    }
}

/**
 * Return true if user is the author of a story
 *
 * @param  {User} user
 * @param  {Story} story
 *
 * @return {Boolean}
 */
function isAuthor(user, story) {
    if (!user || !story) {
        return false;
    }
    if (_.includes(story.user_ids, user.id)) {
        return true;
    }
    return false;
}

/**
 * Return true if user can moderate a project
 *
 * @param  {User} user
 *
 * @return {Boolean}
 */
function canModerate(user) {
    if (!user) {
        return false;
    }
    if (user.type === 'admin' || user.type === 'moderator') {
        return true;
    }
    return false;
}

/**
 * Return true if user can edit a story
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canEditStory(user, story, access) {
    if (access !== 'read-write') {
        return false;
    }
    if (StoryUtils.isEditable(story)) {
        if (canModerate(story)) {
            // allow editing for two weeks
            if (StoryUtils.wasPublishedWithin(story, 14, 'day')) {
                return true;
            }
        }
        if (isAuthor(user, story)) {
            // allow editing for 3 days
            if (StoryUtils.wasPublishedWithin(story, 3, 'day')) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Return true if user can hide a story
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canHideStory(user, story, access) {
    if (access !== 'read-write') {
        return false;
    }
    if (canModerate(user)) {
        return true;
    } else if (isAuthor(user, story)) {
        // guest cannot post private stories
        if (user.type !== 'guest') {
            return true;
        }
    }
    return false;
}

/**
 * Return true if user can remove a story
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canRemoveStory(user, story, access) {
    if (access !== 'read-write') {
        return false;
    }
    if (canModerate(user)) {
        // allow removal for ttwo weeks
        if (StoryUtils.wasPublishedWithin(story, 14, 'day')) {
            return true;
        }
    } else if (isAuthor(user, story)) {
        // allow removal for 3 days
        if (StoryUtils.wasPublishedWithin(story, 3, 'day')) {
            return true;
        }
    }
    return false;
}

/**
 * Return true if user can bump a story
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canBumpStory(user, story, access) {
    if (access !== 'read-write') {
        return false;
    }
    if (canModerate(user) || isAuthor(user, story)) {
        // allow bumping after a day
        if (!StoryUtils.wasBumpedWithin(story, 1, 'day')) {
            return true;
        }
    }
    return false;
}

/**
 * Return true if user can add story to an issue tracker
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {Array<Repo>} repos
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canAddIssue(user, story, repos, access) {
    if (!user) {
        return false;
    }
    if (access !== 'read-write') {
        return false;
    }
    if (StoryUtils.isTrackable(story)) {
        if (canModerate(user) || isAuthor(user, story)) {
            // see if user is a member of one of the repos
            return _.some(repos, (repo) => {
                if (_.includes(repo.user_ids, user.id)) {
                    if (repo.details.issues_enabled) {
                        return true;
                    }
                }
            });
        }
    }
    return false;
}

/**
 * Return true if user can access the repo page
 *
 * @param  {User} user
 * @param  {Repo} repo
 *
 * @return {Boolean}
 */
function canAccessRepo(user, repo) {
    if (!user || !repo) {
        return false;
    }
    if (_.includes(repo.user_ids, user.id)) {
        if (repo.details.web_url) {
            return true;
        }
    }
    return false;
}

/**
 * Return true if user can create a bookmark (for himself)
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canCreateBookmark(user, story, access) {
    if (!user) {
        return false;
    }
    return true;
}

/**
 * Return true if user can send bookmarks to others
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canSendBookmarks(user, story, access) {
    if (user.type === 'guest') {
        return false;
    }
    if (access !== 'read-write') {
        return false;
    }
    return canCreateBookmark(user, story, access);
}

/**
 * Return true if user is author of reaction
 *
 * @param  {User} user
 * @param  {Reaction} reaction
 *
 * @return {Boolean}
 */
function isRespondent(user, reaction) {
    if (!user || !reaction) {
        return false;
    }
    if (reaction.user_id === user.id) {
        return true;
    }
    return false;
}

/**
 * Return true if user can edit a reaction
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {Reaction} reaction
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canEditReaction(user, story, reaction, access) {
    if (!user) {
        return false;
    }
    if (ReactionUtils.isEditable(reaction)) {
        if (isRespondent(user, reaction)) {
            if (access === 'read-write' || access === 'read-comment') {
                // allow editing for 3 days
                if (ReactionUtils.wasPublishedWithin(reaction, 3, 'day')) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Return true if user can remove a reaction
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {Reaction} reaction
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canRemoveReaction(user, story, reaction, access) {
    if (canModerate(user)) {
        if (access === 'read-write') {
            return true;
        }
    }
    if (isRespondent(user, reaction)) {
        if (access === 'read-write' || access === 'read-comment') {
            // allow hide for 3 days
            if (ReactionUtils.wasPublishedWithin(reaction, 3, 'day')) {
                return true;
            }
        }
    }
    if (isAuthor(user, story)) {
        if (access === 'read-write') {
            // allow hidding by authors for 7 days
            if (ReactionUtils.wasPublishedWithin(reaction, 7, 'day')) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Return true if user can hide a reaction
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {Reaction} reaction
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canHideReaction(user, story, reaction, access) {
    if (reaction.type === 'vote') {
        // votes can't be hidden since it affects the count
        return false;
    }
    if (canModerate(user)) {
        if (access === 'read-write') {
            return true;
        }
    }
    if (isAuthor(user, story)) {
        if (user.type !== 'guest') {
            if (access === 'read-write') {
                return true;
            }
        }
    }
    return false;
}

/**
 * Return true if user can receive notification of given type
 *
 * @param  {User} user
 * @param  {Array<Repo>} repos
 * @param  {type} type
 *
 * @return {Boolean}
 */
function canReceiveNotification(user, repos, type) {
    if (_.includes(GitNotificationTypes, type)) {
        // assume user can receive notification if loading isn't done
        if (repos) {
            if (_.isEmpty(repos)) {
                return false;
            }
            if (_.includes(GitNotificationTypes.membership, type)) {
                if (user) {
                    var hasAccess = _.some(repos, (repo) => {
                        return canAccessRepo(user, repo)
                    });
                    if (!hasAccess) {
                        return false;
                    }
                }
            }
        }
    } else if (_.includes(AdminNotificationTypes, type)) {
        if (user && user.type !== 'admin') {
            return false;
        }
    }
    return true;
}

/**
 * Return the display name of the user
 *
 * @param  {User} user
 * @param  {Environment} env
 *
 * @return {String}
 */
function getDisplayName(user, env) {
    let { p } = env.locale;
    if (!user) {
        return '\u00a0';
    }
    var name = p(user.details.name);
    if (!_.trim(name)) {
        name = _.capitalize(user.username);
    }
    return name;
}

/**
 * Return the gender of the user if it's defined
 *
 * @param  {User} user
 */
function getGender(user) {
    if (!user || user.details) {
        return undefined;
    }
    return user.details.gender;
}

export {
    isMember,
    isPendingMember,
    isAuthor,
    isRespondent,
    canJoinProject,
    canViewProject,
    canModerate,
    canEditStory,
    canHideStory,
    canRemoveStory,
    canBumpStory,
    canAddIssue,
    canAccessRepo,
    canCreateBookmark,
    canSendBookmarks,
    canEditReaction,
    canHideReaction,
    canRemoveReaction,
    canReceiveNotification,
    getDisplayName,
    getGender,
    mergeRemoteChanges,
};
