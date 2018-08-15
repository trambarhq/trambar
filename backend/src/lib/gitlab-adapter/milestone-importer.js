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
    updateMilestones,
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
        var criteria = {
            external_object: ExternalDataUtils.extendLink(server, repo, {
                milestone: { id: glMilestone.id }
            }),
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            // the story is linked to both the milestone and the repo
            var storyAfter = copyMilestoneProperties(story, system, server, repo, author, glMilestone);
            if (storyAfter === story) {
                return story;
            }
            return Story.saveOne(db, schema, storyAfter);
        });
    });
}

/**
 * Update properties of milestone stories
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise<Array>}
 */
function updateMilestones(db, system, server, repo, project) {
    var schema = project.name;
    var repoLink = ExternalDataUtils.findLink(repo, server);
    // find milestone stories
    var criteria = {
        type: 'milestone',
        external_object: repoLink,
        deleted: false,
    };
    return Story.find(db, schema, criteria, '*').then((stories) => {
        // fetch milestones from GitLab
        return fetchMilestones(server, repoLink.project.id).then((glMilestones) => {
            // delete ones that no longer exists
            return Promise.each(stories, (story) => {
                var storyLink = ExternalDataUtils.findLink(story, server);
                if (!_.some(glMilestones, { id: storyLink.milestone.id })) {
                    return Story.updateOne(db, schema, { id: story.id, deleted: true });
                }
            }).return(glMilestones);
        }).mapSeries((glMilestone) => {
            var story = _.find(stories, (story) => {
                return !!ExternalDataUtils.findLink(story, server, {
                    milestone: { id: glMilestone.id }
                });
            });
            if (story) {
                var storyAfter = copyMilestoneProperties(story, system, server, repo, null, glMilestone);
                if (storyAfter !== story) {
                    return Story.updateOne(db, schema, storyAfter);
                }
            }
        });
    }).then((stories) => {
        return _.filter(stories);
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
    if (author) {
        ExternalDataUtils.importProperty(storyAfter, server, 'user_ids', {
            value: [ author.id ],
            overwrite: 'always',
        });
        ExternalDataUtils.importProperty(storyAfter, server, 'role_ids', {
            value: author.role_ids,
            overwrite: 'always',
        });
    }
    ExternalDataUtils.importProperty(storyAfter, server, 'details.title', {
        value: glMilestone.title,
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

/**
 * Retrieve milestone from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glMilestoneId
 *
 * @return {Promise<Object>}
 */
function fetchMilestones(server, glProjectId) {
    var url = `/projects/${glProjectId}/milestones`;
    return Transport.fetchAll(server, url);
}
