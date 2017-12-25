var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TagScanner = require('utils/tag-scanner');
var LinkUtils = require('objects/utils/link-utils');

var Import = require('external-services/import');
var Transport = require('gitlab-adapter/transport');

// accessors
var Story = require('accessors/story');

module.exports = {
    importEvent,
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
    return fetchMilestone(server, repoLink.project.id, glEvent.target_id).then((glMilestone) => {
        // the story is linked to both the issue and the repo
        var milestoneLink = LinkUtils.extend(repoLink, {
            milestone: { id: glMilestone.id }
        });
        var storyNew = copyMilestoneProperties(null, author, glMilestone, milestoneLink);
        return Story.insertOne(db, schema, storyNew);
    });
}

/**
 * Copy properties of milestone
 *
 * @param  {Story|null} story
 * @param  {User} author
 * @param  {Object} glMilestone
 * @param  {Object} link

 * @return {Object|null}
 */
function copyMilestoneProperties(story, author, glMilestone, link) {
    var storyAfter = _.cloneDeep(story) || {};
    var milestoneLink = Import.join(storyAfter, link);
    var descriptionTags = TagScanner.findTags(glMilestone.description);
    milestoneLink.milestone.number = glMilestone.iid;
    _.set(storyAfter, 'type', 'milestone');
    _.set(storyAfter, 'tags', descriptionTags);
    _.set(storyAfter, 'user_ids', [ author.id ]);
    _.set(storyAfter, 'role_ids', author.role_ids);
    _.set(storyAfter, 'public', true);
    _.set(storyAfter, 'published', true);
    _.set(storyAfter, 'ptime', Moment(glMilestone.created_at).toISOString());
    _.set(storyAfter, 'details.state', glMilestone.state);
    _.set(storyAfter, 'details.title', glMilestone.title);
    _.set(storyAfter, 'details.due_date', glMilestone.due_date);
    _.set(storyAfter, 'details.start_date', glMilestone.start_date);
    if (_.isEqual(story, storyAfter)) {
        return null;
    }
    return storyAfter;
}

/**
 * Retrieve milestone from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glMilestoneId
 *
 * @return {Promise<Object>}
 */
function fetchMilestone(server, glProjectId, glMilestoneId) {
    var url = `/projects/${glProjectId}/milestones/${glMilestoneId}`;
    return Transport.fetch(server, url);
}
