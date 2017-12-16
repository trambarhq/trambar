var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TagScanner = require('utils/tag-scanner');
var LinkUtils = require('objects/utils/link-utils');

var Import = require('external-services/import');
var Transport = require('gitlab-adapter/transport');
var UserImporter = require('gitlab-adapter/user-importer');

// accessors
var Reaction = require('accessors/reaction');
var Story = require('accessors/story');

module.exports = {
    importEvent,
    importHookEvent,
};

/**
 * Import an activity log entry about an merge request
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story>}
 */
function importEvent(db, server, repo, project, author, glEvent) {
    var schema = project.name;
    var repoLink = LinkUtils.find(repo, { server, relation: 'project' });
    return fetchMergeRequest(server, repoLink.project.id, glEvent.target_id).then((glMergeRequest) => {
        // the story is linked to both the merge request and the repo
        var mergeRequestLink = LinkUtils.extend(repoLink, {
            merge_request: { id: glMergeRequest.id }
        });
        // find existing merge request
        var criteria = {
            external_object: mergeRequestLink,
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            var storyAfter = copyMergeRequestProperties(story, author, glMergeRequest, mergeRequestLink);
            if (storyAfter) {
                return Story.saveOne(db, schema, storyAfter);
            } else {
                return story;
            }
        }).then((story) => {
            return importAssignment(db, server, project, repo, story, glMergeRequest).return(story);
        });
    });
}

/**
 * Handle a Gitlab hook event concerning an merge request
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story|false>}
 */
function importHookEvent(db, server, repo, project, author, glHookEvent) {
    if (glHookEvent.object_attributes.action === 'update') {
        // construct a glMergeRequest object from data in hook event
        var glMergeRequest = _.omit(glHookEvent.object_attributes, 'action');
        glMergeRequest.labels = _.map(glHookEvent.labels, 'title');
        glMergeRequest.assignee = { id: glHookEvent.object_attributes.assignee_id };

        // find existing story
        var schema = project.name;
        var repoLink = LinkUtils.find(repo, { server, relation: 'project' });
        var mergeRequestLink = LinkUtils.extend(repoLink, {
            merge_request: { id: glMergeRequest.id }
        });
        var criteria = {
            external_object: mergeRequestLink,
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            if (!story) {
                return null;
            }
            var storyAfter = copyMergeRequestProperties(story, author, glMergeRequest, mergeRequestLink);
            if (storyAfter) {
                return Story.updateOne(db, schema, storyAfter);
            } else {
                return story;
            }
        }).then((story) => {
            if (!story) {
                return null;
            }
            return importAssignment(db, server, project, repo, story, glMergeRequest).return(story);
        });
    } else {
        return Promise.resolve(false);
    }
}

/**
 * Add assignment reactions to story
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Project} project
 * @param  {Repo} repo
 * @param  {Story} story
 * @param  {Object} glMergeRequest
 *
 * @return {Promise<Reaction>}
 */
function importAssignment(db, server, project, repo, story, glMergeRequest) {
    var schema = project.name;
    var repoLink = LinkUtils.find(repo, { server, relation: 'project' });
    var mergeRequestLink = LinkUtils.extend(repoLink, {
        merge_request: { id: glMergeRequest.id }
    });
    // find existing assignments
    var criteria = {
        story_id: story.id,
        type: 'assignment',
        external_object: mergeRequestLink,
    };
    return Reaction.find(db, schema, criteria, 'user_id').then((reactions) => {
        var glUser = glMergeRequest.assignee;
        return UserImporter.findUser(db, server, glUser).then((assignee) => {
            if (!_.some(reactions, { user_id: assignee.id })) {
                var reactionNew = copyAssignmentProperties(null, story, assignee, glMergeRequest, mergeRequestLink);
                return Reaction.saveOne(db, schema, reactionNew);
            }
        });
    });
}

/**
 * Copy certain properties of the merge request into the story
 *
 * From Gitlab documentation:
 *
 *   id - is uniq across all MergeRequests table
 *   iid - is uniq only in scope of single project
 *
 * @param  {Story|null} story
 * @param  {User} author
 * @param  {Object} glMergeRequest
 * @param  {Object} link
 *
 * @return {Object|null}
 */
function copyMergeRequestProperties(story, author, glMergeRequest, link) {
    var storyAfter = _.cloneDeep(story) || {};
    var mergeRequestLink = Import.join(storyAfter, link);
    var descriptionTags = TagScanner.findTags(glMergeRequest.description);
    var labelTags = _.map(glMergeRequest.labels, (label) => { return `#${label}`; });
    _.set(storyAfter, 'type', 'merge-request');
    _.set(storyAfter, 'user_ids', [ author.id ]);
    _.set(storyAfter, 'role_ids', author.role_ids);
    _.set(storyAfter, 'published', true);
    _.set(storyAfter, 'ptime', Moment(new Date(glMergeRequest.created_at)).toISOString());
    _.set(storyAfter, 'public', !glMergeRequest.confidential);
    _.set(storyAfter, 'tags', _.union(descriptionTags, labelTags));
    _.set(storyAfter, 'details.state', glMergeRequest.state);
    _.set(storyAfter, 'details.branch', glMergeRequest.target_branch);
    _.set(storyAfter, 'details.source_branch', glMergeRequest.source_branch);
    _.set(storyAfter, 'details.labels', glMergeRequest.labels);
    _.set(storyAfter, 'details.milestone', _.get(glMergeRequest, 'milestone.title'));
    _.set(storyAfter, 'details.title', Import.multilingual(glMergeRequest.title));
    _.set(storyAfter, 'details.number', glMergeRequest.iid);
    if (_.isEqual(story, storyAfter)) {
        return null;
    }
    return storyAfter;
}

/**
 * Copy certain properties of the merge request into the assignment reaction
 *
 * @param  {Reaction|null} reaction
 * @param  {Story} story
 * @param  {User} assignee
 * @param  {Object} glMergeRequest
 * @param  {Object} link
 *
 * @return {Object|null}
 */
function copyAssignmentProperties(reaction, story, assignee, glMergeRequest, link) {
    var reactionAfter = _.cloneDeep(reaction) || {};
    Import.join(reactionAfter, link);
    _.set(reactionAfter, 'type', 'assignment');
    _.set(reactionAfter, 'story_id', story.id);
    _.set(reactionAfter, 'user_id', assignee.id);
    _.set(reactionAfter, 'published', true);
    _.set(reactionAfter, 'ptime', Moment(glMergeRequest.updated_at).toISOString());
    if (_.isEqual(reaction, reactionAfter)) {
        return null;
    }
    return reactionAfter;
}

/**
 * Retrieve merge request from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glMergeRequestId
 *
 * @return {Object}
 */
function fetchMergeRequest(server, glProjectId, glMergeRequestId) {
    var url = `/projects/${glProjectId}/merge_requests/${glMergeRequestId}`;
    return Transport.fetch(server, url);
}
