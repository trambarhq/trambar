var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TagScanner = require('utils/tag-scanner');
var ExternalDataUtils = require('objects/utils/external-data-utils');

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
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story>}
 */
function importEvent(db, system, server, repo, project, author, glEvent) {
    var schema = project.name;
    var repoLink = ExternalDataUtils.findLink(repo, server);
    return fetchMilestone(server, repoLink.project.id, glEvent.target_id).then((glMilestone) => {
        // the story is linked to both the issue and the repo
        var storyNew = copyMilestoneProperties(null, system, server, repo, author, glMilestone);
        return Story.insertOne(db, schema, storyNew);
    });
}

/**
 * Copy properties of milestone
 *
 * @param  {Story|null} story
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} glMilestone
 *
 * @return {Story}
 */
function copyMilestoneProperties(story, system, server, repo, author, glMilestone) {
    var descriptionTags = TagScanner.findTags(glMilestone.description);
    var defLangCode = _.get(system, [ 'settings', 'input_languages', 0 ]);

    var storyAfter = _.cloneDeep(story) || {};
    ExternalDataUtils.inheritLink(storyAfter, server, repo, {
        milestone: { id: glMilestone.id }
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: 'milestone',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'tags', {
        value: descriptionTags,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'language_codes', {
        value: [ defLangCode ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'user_ids', {
        value: [ author.id ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'role_ids', {
        value: author.role_ids,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.state', {
        value: glMilestone.state,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.title', {
        value: glMilestone.title,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.due_date', {
        value: glMilestone.due_date,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.start_date', {
        value: glMilestone.start_date,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'ptime', {
        value: Moment(glMilestone.created_at).toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(storyAfter, story)) {
        return story;
    }
    storyAfter.itime = new String('NOW()');
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
