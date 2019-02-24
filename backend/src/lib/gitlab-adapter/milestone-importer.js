import _ from 'lodash';
import Moment from 'moment';
import * as TagScanner from 'utils/tag-scanner';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

import * as Transport from 'gitlab-adapter/transport';

// accessors
import Story from 'accessors/story';

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
async function importEvent(db, system, server, repo, project, author, glEvent) {
    if (!glEvent.target_id) {
        // milestone was deleted
        return null;
    }
    let schema = project.name;
    let repoLink = ExternalDataUtils.findLink(repo, server);
    let glMilestone = await fetchMilestone(server, repoLink.project.id, glEvent.target_id);
    // the story is linked to both the issue and the repo
    let criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            milestone: { id: glMilestone.id }
        }),
    };
    let story = await Story.findOne(db, schema, criteria, '*');
    let storyAfter = copyMilestoneProperties(story, system, server, repo, author, glMilestone);
    if (storyAfter !== story) {
        story = await Story.saveOne(db, schema, storyAfter);
    }
    return story;
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
async function updateMilestones(db, system, server, repo, project) {
    let storyList = [];
    let schema = project.name;
    let repoLink = ExternalDataUtils.findLink(repo, server);
    // find milestone stories
    let criteria = {
        type: 'milestone',
        external_object: repoLink,
        deleted: false,
    };
    let stories = await Story.find(db, schema, criteria, '*');
    // fetch milestones from GitLab
    let glMilestones = await fetchMilestones(server, repoLink.project.id);
    // delete ones that no longer exists
    for (let story of stories) {
        let storyLink = ExternalDataUtils.findLink(story, server);
        if (!_.some(glMilestones, { id: storyLink.milestone.id })) {
            await Story.updateOne(db, schema, { id: story.id, deleted: true });
        }
    }
    for (let glMilestone of glMilestones) {
        let story = _.find(stories, (story) => {
            return !!ExternalDataUtils.findLink(story, server, {
                milestone: { id: glMilestone.id }
            });
        });
        if (story) {
            let storyAfter = copyMilestoneProperties(story, system, server, repo, null, glMilestone);
            if (storyAfter !== story) {
                story = await Story.updateOne(db, schema, storyAfter);
            }
            storyList.push(story);
        }
    }
    return storyList;
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
    let descriptionTags = TagScanner.findTags(glMilestone.description);
    let defLangCode = _.get(system, [ 'settings', 'input_languages', 0 ]);

    let storyAfter = _.cloneDeep(story) || {};
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
async function fetchMilestone(server, glProjectId, glMilestoneId) {
    let url = `/projects/${glProjectId}/milestones/${glMilestoneId}`;
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
async function fetchMilestones(server, glProjectId) {
    let url = `/projects/${glProjectId}/milestones`;
    return Transport.fetchAll(server, url);
}

export {
    importEvent,
    updateMilestones,
};
