var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TagScanner = require('utils/tag-scanner');
var ExternalObjectUtils = require('objects/utils/external-object-utils');

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
    var repoLink = ExternalObjectUtils.findLink(repo, server);
    return fetchMergeRequest(server, repoLink.project.id, glEvent.target_id).then((glMergeRequest) => {
        // the story is linked to both the merge request and the repo
        var criteria = {
            external_object: ExternalObjectUtils.extendLink(server, repo, {
                merge_request: { id: glMergeRequest.id }
            })
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            var storyAfter = copyMergeRequestProperties(story, server, repo, author, glMergeRequest);
            if (_.isEqual(storyAfter, story)) {
                return story;
            }
            return Story.saveOne(db, schema, storyAfter);
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
        var criteria = {
            external_object: ExternalObjectUtils.extendLink(server, repo, {
                merge_request: { id: glMergeRequest.id }
            }),
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            if (!story) {
                throw new Error('Story not found')
            }
            var storyAfter = copyMergeRequestProperties(story, server, repo, author, glMergeRequest);
            if (_.isEqual(storyAfter, story)) {
                return story;
            }
            return Story.updateOne(db, schema, storyAfter);
        }).then((story) => {
            return importAssignment(db, server, project, repo, story, glMergeRequest).return(story);
        }).catch((err) => {
            console.error(err);
            return null;
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
    // find existing assignments
    var criteria = {
        story_id: story.id,
        type: 'assignment',
        external_object: ExternalObjectUtils.findLink(story, server),
    };
    return Reaction.find(db, schema, criteria, 'user_id').then((reactions) => {
        var glUser = glMergeRequest.assignee;
        return UserImporter.findUser(db, server, glUser).then((assignee) => {
            if (!_.some(reactions, { user_id: assignee.id })) {
                var reactionNew = copyAssignmentProperties(null, server, story, assignee, glMergeRequest);
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
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} glMergeRequest
 * @param  {Object} link
 *
 * @return {Object|null}
 */
function copyMergeRequestProperties(story, server, repo, author, glMergeRequest) {
    var descriptionTags = TagScanner.findTags(glMergeRequest.description);
    var labelTags = _.map(glMergeRequest.labels, (label) => { return `#${_.replace(label, /\s+/g, '-')}`; });
    var tags = _.union(descriptionTags, labelTags);

    var storyAfter = _.cloneDeep(story) || {};
    ExternalObjectUtils.inheritLink(storyAfter, server, repo, {
        merge_request: { id: glMergeRequest.id }
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'type', {
        value: 'merge-request',
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'tags', {
        value: tags,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'user_ids', {
        value: [ author.id ],
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'role_ids', {
        value: author.role_ids,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.state', {
        value: glMergeRequest.state,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.branch', {
        value: glMergeRequest.target_branch,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.source_branch', {
        value: glMergeRequest.source_branch,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.labels', {
        value: glMergeRequest.labels,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.milestone', {
        value: _.get(glMergeRequest, 'milestone.title'),
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.title', {
        value: glMergeRequest.title,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'public', {
        value: !glIssue.confidential,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'ptime', {
        value: Moment(new Date(glIssue.created_at)).toISOString(),
        overwrite: 'always',
    });
    return storyAfter;
}

/**
 * Copy certain properties of the merge request into the assignment reaction
 *
 * @param  {Reaction|null} reaction
 * @param  {Server} server
 * @param  {Story} story
 * @param  {User} assignee
 * @param  {Object} glMergeRequest
 *
 * @return {Object|null}
 */
function copyAssignmentProperties(reaction, server, story, assignee, glMergeRequest) {
    var reactionAfter = _.cloneDeep(reaction) || {};
    ExternalObjectUtils.inheritLink(reactionAfter, server, story);
    ExternalObjectUtils.importProperty(reactionAfter, server, 'type', {
        value: 'assignment',
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'story_id', {
        value: story.id,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'user_id', {
        value: assignee.id,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(reactionAfter, server, 'ptime', {
        value: Moment(glMergeRequest.updated_at).toISOString(),
        overwrite: 'always',
    });
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
