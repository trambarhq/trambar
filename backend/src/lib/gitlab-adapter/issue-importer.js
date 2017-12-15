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
 * Import an activity log entry about an issue
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
    return fetchIssue(server, repoLink.project.id, glEvent.target_id).then((glIssue) => {
        // the story is linked to both the issue and the repo
        var issueLink = LinkUtils.extend(repoLink, {
            issue: { id: glIssue.id }
        });
        // find existing issuerepoLink
        var criteria = {
            type: 'issue',
            external_object: issueLink,
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            var storyAfter = copyIssueProperties(story, author, glIssue, issueLink);
            if (storyAfter) {
                return Story.saveOne(db, schema, storyAfter);
            } else {
                return story;
            }
        }).then((story) => {
            return importAssignments(db, server, project, repo, story, glIssue).return(story);
        });
    });
}

/**
 * Handle a Gitlab hook event concerning an issue
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
        // construct a glIssue object from data in hook event
        var glIssue = _.omit(glHookEvent.object_attributes, 'action');
        glIssue.labels = _.map(glHookEvent.labels, 'title');
        glIssue.assignees = _.map(glHookEvent.object_attributes.assignee_ids, (id) => {
            return { id };
        });

        // find existing story
        var schema = project.name;
        var repoLink = LinkUtils.find(repo, { server, relation: 'project' });
        var issueLink = LinkUtils.extend(repoLink, {
            issue: { id: glIssue.id }
        });
        var criteria = {
            type: 'issue',
            external_object: issueLink,
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            if (!story) {
                return null;
            }
            var storyAfter = copyIssueProperties(story, author, glIssue, issueLink);
            if (storyAfter) {
                return Story.updateOne(db, schema, storyAfter);
            } else {
                return story;
            }
        }).then((story) => {
            if (!story) {
                return null;
            }
            return importAssignments(db, server, project, repo, story, glIssue).return(story);
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
 * @param  {Object} glIssue
 *
 * @return {Promise<Array<Reaction>>}
 */
function importAssignments(db, server, project, repo, story, glIssue) {
    var schema = project.name;
    var repoLink = LinkUtils.find(repo, { server, relation: 'project' });
    var issueLink = LinkUtils.extend(repoLink, {
        issue: { id: glIssue.id }
    });
    // find existing assignments
    var criteria = {
        story_id: story.id,
        type: 'assignment',
        external_object: issueLink,
    };
    return Reaction.find(db, schema, criteria, 'user_id').then((reactions) => {
        return Promise.mapSeries(glIssue.assignees, (glUser) => {
            return UserImporter.findUser(db, server, glUser).then((assignee) => {
                if (!_.some(reactions, { user_id: assignee.id })) {
                    var reactionNew = copyAssignmentProperties(null, story, assignee, glIssue, issueLink);
                    return Reaction.saveOne(db, schema, reactionNew);
                }
            });
        }).filter(Boolean);
    });
}

/**
 * Copy certain properties of the issue into the story
 *
 * From Gitlab documentation:
 *
 *   id - is uniq across all Issues table
 *   iid - is uniq only in scope of single project
 *
 * @param  {Story|null} story
 * @param  {User} author
 * @param  {Object} glIssue
 * @param  {Object} link
 *
 * @return {Object|null}
 */
function copyIssueProperties(story, author, glIssue, link) {
    var storyAfter = _.cloneDeep(story) || {};
    var imported = Import.reacquire(storyAfter, link, 'issue');
    _.set(storyAfter, 'type', 'issue');
    _.set(storyAfter, 'user_ids', [ author.id ]);
    _.set(storyAfter, 'role_ids', author.role_ids);
    _.set(storyAfter, 'published', true);
    _.set(storyAfter, 'ptime', Moment(new Date(glIssue.created_at)).toISOString());
    Import.set(storyAfter, imported, 'public', !glIssue.confidential);
    Import.set(storyAfter, imported, 'tags', TagScanner.findTags(glIssue.description));
    Import.set(storyAfter, imported, 'details.state', glIssue.state);
    Import.set(storyAfter, imported, 'details.labels', glIssue.labels);
    Import.set(storyAfter, imported, 'details.milestone', _.get(glIssue, 'milestone.title'));
    Import.set(storyAfter, imported, 'details.title', Import.multilingual(glIssue.title));
    Import.set(storyAfter, imported, 'details.number', glIssue.iid);
    Import.set(storyAfter, imported, 'details.url', glIssue.web_url);
    if (_.isEqual(story, storyAfter)) {
        return null;
    }
    return storyAfter;
}

/**
 * Copy certain properties of the issue into the assignment reaction
 *
 * @param  {Reaction|null} reaction
 * @param  {Story} story
 * @param  {User} assignee
 * @param  {Object} glIssue
 * @param  {Object} link
 *
 * @return {Object|null}
 */
function copyAssignmentProperties(reaction, story, assignee, glIssue, link) {
    var reactionAfter = _.cloneDeep(reaction) || {};
    Import.join(reactionAfter, link);
    _.set(reactionAfter, 'type', 'assignment');
    _.set(reactionAfter, 'story_id', story.id);
    _.set(reactionAfter, 'user_id', assignee.id);
    _.set(reactionAfter, 'published', true);
    _.set(reactionAfter, 'ptime', Moment(glIssue.updated_at).toISOString());
    if (_.isEqual(reaction, reactionAfter)) {
        return null;
    }
    return reactionAfter;
}

/**
 * Retrieve issue from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glIssueId
 *
 * @return {Object}
 */
function fetchIssue(server, glProjectId, glIssueId) {
    var url = `/projects/${glProjectId}/issues/${glIssueId}`;
    return Transport.fetch(server, url);
}
