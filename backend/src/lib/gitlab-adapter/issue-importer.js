var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TagScanner = require('utils/tag-scanner');

var Transport = require('gitlab-adapter/transport');
var Import = require('gitlab-adapter/import');
var UserImporter = require('gitlab-adapter/user-importer');
var CommentImporter = require('gitlab-adapter/comment-importer');

// accessors
var Reaction = require('accessors/reaction');
var Story = require('accessors/story');

exports.importEvent = importEvent;

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
 * @return {Promise}
 */
function importEvent(db, server, repo, project, author, glEvent) {
    var schema = project.name;
    var repoLink = Import.Link.find(repo, server);
    return fetchIssue(server, repoLink.project.id, glEvent.target_id).then((glIssue) => {
        // the story is linked to both the issue and the repo
        var issueLink = {
            type: 'gitlab',
            issue: { id: glIssue.id }
        };
        var link = _.merge({}, repoLink, issueLink);
        var storyNew = copyIssueProperties(null, author, glIssue, link);
        return Story.insertOne(db, schema, storyNew).then((story) => {
            return UserImporter.importUsers(db, server, glIssue.assignees).each((assignee) => {
                var reactionNew = copyAssignmentProperties(null, story, assignee, glIssue, link);
                return Reaction.saveOne(db, schema, reactionNew);
            }).then(() => {
                if (glIssue.user_notes_count > 0) {
                    return CommentImporter.importComments(db, server, project, story);
                }
            }).return(story);
        });
    });
}

/**
 * Update an issue story with latest information from Gitlab
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Story} story
 *
 * @return {Promise<Story>}
 */
function updateStory(db, server, story) {
    var schema = project.name;
    var link = Import.Link.find(story, server);
    return fetchIssue(server, link.project.id, link.issue.id).then((glIssue) => {
        return UserImport.importUser(db, server, glIssue.author).then((author) => {
            var storyAfter = copyIssueProperties(story, author, glIssue, link);
            if (storyAfter) {
                return Story.updateOne(db, schema, storyAfter);
            } else {
                return story;
            }
        });
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
    _.set(storyAfter, 'ptime', Moment(glIssue.created_at).toISOString());
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
