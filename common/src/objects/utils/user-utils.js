import _ from 'lodash';
import Moment from 'moment';
import { isEditable as isReactionEditable, wasPublishedWithin as wasReactionPublishedWithin } from './reaction-utils.js';
import { isEditable as isStoryEditable, isTrackable as isStoryTrackable,
  wasPublishedWithin as wasStoryPublishedWithin, wasBumpedWithin as wasStoryBumpedWithin } from './story-utils.js';
import { mergeRemoteChanges } from './story-utils.js';
import { GitNotificationTypes, AdminNotificationTypes, MembershipNotificationTypes } from '../types/notification-types.js';

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
  return project.user_ids.includes(user.id);
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
  return !!user?.requested_project_ids.includes(project.id);
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
  if (story.user_ids.includes(user.id)) {
    return true;
  }
  return false;
}

/**
 * Return true if user is the lead author
 *
 * @param  {Array<User>} authors
 * @param  {User} user
 *
 * @return {Boolean}
 */
function isLeadAuthor(authors, user) {
  if (!authors || !user) {
    return false;
  }
  return authors.findIndex(usr => usr.id === user.id) === 0;
}

/**
 * Return true if user is an coauthor
 *
 * @param  {Array<User>} authors
 * @param  {User} user
 *
 * @return {Boolean}
 */
function isCoauthor(authors, user) {
  if (!authors || !user) {
    return false;
  }
  return authors.findIndex(usr.id === user.id) >= 1;
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
  if (isStoryEditable(story)) {
    if (canModerate(story)) {
      // allow editing for two weeks
      if (wasStoryPublishedWithin(story, 14, 'day')) {
        return true;
      }
    }
    if (isAuthor(user, story)) {
      // allow editing for 3 days
      if (wasStoryPublishedWithin(story, 3, 'day')) {
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
    if (wasStoryPublishedWithin(story, 14, 'day')) {
      return true;
    }
  } else if (isAuthor(user, story)) {
    // allow removal for 3 days
    if (wasStoryPublishedWithin(story, 3, 'day')) {
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
    if (!wasStoryBumpedWithin(story, 1, 'day')) {
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
 * @param  {Repo|Array<Repo>} repo
 * @param  {String} access
 *
 * @return {Boolean}
 */
function canAddIssue(user, story, repo, access) {
  if (repo instanceof Array) {
    return repo.some((repo) => {
      return canAddIssue(user, story, repo, access);
    });
  } else if (!repo) {
    return false;
  }
  if (!user) {
    return false;
  }
  if (access !== 'read-write') {
    return false;
  }
  if (isStoryTrackable(story)) {
    // see if user is a member of one of the repos
    if (repo.user_ids.includes(user.id)) {
      if (repo.details.issues_enabled) {
        return true;
      }
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
  if (repo.user_ids.includes(user.id)) {
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
  if (isReactionEditable(reaction)) {
    if (isRespondent(user, reaction)) {
      if (access === 'read-write' || access === 'read-comment') {
        // allow editing for 3 days
        if (wasReactionPublishedWithin(reaction, 3, 'day')) {
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
      if (wasReactionPublishedWithin(reaction, 3, 'day')) {
        return true;
      }
    }
  }
  if (isAuthor(user, story)) {
    if (access === 'read-write') {
      // allow hidding by authors for 7 days
      if (wasReactionPublishedWithin(reaction, 7, 'day')) {
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
  if (GitNotificationTypes.includes(type)) {
    // assume user can receive notification if loading isn't done
    if (repos) {
      if (repos.length === 0) {
        return false;
      }
      if (MembershipNotificationTypes.includes(type)) {
        if (user) {
          let hasAccess = repos.some((repo) => {
            return canAccessRepo(user, repo)
          });
          if (!hasAccess) {
            return false;
          }
        }
      }
    }
  } else if (AdminNotificationTypes.includes(type)) {
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
function getUserName(user, env) {
  let { p } = env.locale;
  return p(_.get(user, 'details.name')) || _.capitalize(_.get(user, 'username')) || '';
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
  isLeadAuthor,
  isCoauthor,
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
  getUserName,
  getGender,
  mergeRemoteChanges,
};
