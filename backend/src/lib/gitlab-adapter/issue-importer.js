import _ from 'lodash';
import Moment from 'moment';
import * as Localization from 'localization';
import * as TagScanner from 'utils/tag-scanner';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

import * as Transport from 'gitlab-adapter/transport';
import * as AssignmentImporter from 'gitlab-adapter/assignment-importer';

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
    let schema = project.name;
    let repoLink = ExternalDataUtils.findLink(repo, server);
    let glIssue = await fetchIssue(server, repoLink.project.id, glEvent.target_id);
    // the story is linked to both the issue and the repo
    let criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            issue: { id: glIssue.id }
        }),
    };
    let story = await Story.findOne(db, schema, criteria, '*');
    let assignments = await AssignmentImporter.findIssueAssignments(db, server, glIssue);
    let opener = (glEvent.action_name === 'opened') ? author : null;
    let storyAfter = copyIssueProperties(story, system, server, repo, opener, assignments, glIssue);
    if (storyAfter !== story) {
        story = await Story.saveOne(db, schema, storyAfter);
    }
    try {
        await AssignmentImporter.importAssignments(db, server, project, repo, story, assignments);
    } catch (err) {
        if (err instanceof AssignmentImporter.ObjectMovedError) {
            // the issue has been moved to a different repo--delete the
            // story if it was imported
            if (story) {
                let storyAfter = { id: story.id, deleted: true };
                await Story.saveOne(db, schema, storyAfter);
                story = null;
            }
        } else {
            throw err;
        }
    }
    return story;
}

/**
 * Handle a Gitlab hook event concerning an issue
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story|false>}
 */
async function importHookEvent(db, system, server, repo, project, author, glHookEvent) {
    if (glHookEvent.object_attributes.action !== 'update') {
        return false;
    }
    // construct a glIssue object from data in hook event
    let repoLink = ExternalDataUtils.findLink(repo, server);
    let glIssue = _.omit(glHookEvent.object_attributes, 'action');
    glIssue.project_id = repoLink.project.id;
    glIssue.labels = _.map(glHookEvent.labels, 'title');
    if (glHookEvent.assignee) {
        glIssue.assignee = _.clone(glHookEvent.assignee);
        glIssue.assignee.id = glHookEvent.object_attributes.assignee_id;
    }

    // find existing story
    let schema = project.name;
    let criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            issue: { id: glIssue.id }
        }),
    };
    let story = await Story.findOne(db, schema, criteria, '*');
    if (!story) {
        throw new Error('Story not found');
    }
    let assignments = await AssignmentImporter.findIssueAssignments(db, server, glIssue);
    // the author of the hook event isn't the issue's author,
    // hence we're passing null here
    let opener = null;
    let storyAfter = copyIssueProperties(story, system, server, repo, opener, assignments, glIssue);
    if (storyAfter !== story) {
        story = await Story.updateOne(db, schema, storyAfter);
    }
    try {
        await AssignmentImporter.importAssignments(db, server, project, repo, story, assignments);
    } catch (err) {
        if (err instanceof AssignmentImporter.ObjectMovedError) {
            // the issue has been moved to a different repo--delete the
            // story if it was imported
            if (story) {
                let storyAfter = { id: story.id, deleted: true };
                await Story.saveOne(db, schema, storyAfter);
                story = null;
            }
        }
    }
    return story;
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
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} opener
 * @param  {Array<Object>} assignments
 * @param  {Object} glIssue
 *
 * @return {Story}
 */
function copyIssueProperties(story, system, server, repo, opener, assignments, glIssue) {
    let descriptionTags = TagScanner.findTags(glIssue.description);
    let labelTags = _.map(glIssue.labels, (label) => {
        return `#${_.replace(label, /\s+/g, '-')}`;
    });
    let tags = _.union(descriptionTags, labelTags);
    let langCode = Localization.getDefaultLanguageCode(system);

    let state = glIssue.state;
    if (state === 'opened') {
        if (story) {
            // GitLab 11 doesn't report a state of reopened anymore
            // derived it based on the previous state
            let prevState = story.details.state;
            if (prevState === 'closed' || prevState === 'reopened') {
                state = 'reopened';
            }
        }
    }

    let storyAfter = _.cloneDeep(story) || {};
    ExternalDataUtils.inheritLink(storyAfter, server, repo, {
        issue: {
            id: glIssue.id,
            number: glIssue.iid,
        }
    });
    let exported = !!storyAfter.etime;
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: 'issue',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'tags', {
        value: tags,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'language_codes', {
        value: [ langCode ],
        overwrite: 'always',
        ignore: exported,
    });
    if (opener) {
        ExternalDataUtils.importProperty(storyAfter, server, 'user_ids', {
            value: [ opener.id ],
            overwrite: 'always',
            ignore: exported,
        });
        ExternalDataUtils.importProperty(storyAfter, server, 'role_ids', {
            value: opener.role_ids,
            overwrite: 'always',
            ignore: exported,
        });
    }
    ExternalDataUtils.importProperty(storyAfter, server, 'details.title', {
        value: glIssue.title,
        overwrite: 'match-previous:title',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.labels', {
        value: glIssue.labels,
        overwrite: 'match-previous:labels',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.state', {
        value: state,
        overwrite: 'always',
        ignore: exported,
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.milestone', {
        value: _.get(glIssue, 'milestone.title'),
        overwrite: 'always',
        ignore: exported,
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'published', {
        value: true,
        overwrite: 'always',
        ignore: exported,
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'public', {
        value: !glIssue.confidential,
        overwrite: 'always',
        ignore: exported,
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'ptime', {
        value: Moment(new Date(glIssue.created_at)).toISOString(),
        overwrite: 'always',
        ignore: exported,
    });
    if (_.isEqual(storyAfter, story)) {
        return story;
    }
    if (story) {
        if (story.details.state !== storyAfter.details.state) {
            // bump the story when its state changes
            storyAfter.btime = Moment().toISOString();
        }
    }
    storyAfter.itime = new String('NOW()');
    return storyAfter;
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
async function fetchIssue(server, glProjectId, glIssueId) {
    // Gitlab wants the issue IID (i.e. issue number), which unfortunately isn't
    // included in the activity log entry
    let glIssueNumber = await getIssueNumber(server, glProjectId, glIssueId);
    let url = `/projects/${glProjectId}/issues/${glIssueNumber}`;
    return Transport.fetch(server, url);
}

/**
 * Return the issue number given an issue id, fetching the full issue list to
 * find the mapping
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glIssueId
 *
 * @return {Promise<Number>}
 */
async function getIssueNumber(server, glProjectId, glIssueId) {
    let baseURL = _.get(server, 'settings.oauth.base_url');
    let issueNumber = _.get(issueNumberCache, [ baseURL, glProjectId, glIssueId ]);
    if (!issueNumber) {
        let url = `/projects/${glProjectId}/issues`;
        await Transport.fetchEach(server, url, {}, (glIssue) => {
            _.set(issueNumberCache, [ baseURL, glProjectId, glIssue.id ], glIssue.iid);
            if (glIssueId === glIssue.id) {
                return false;
            }
        });
        issueNumber = _.get(issueNumberCache, [ baseURL, glProjectId, glIssueId ]);
        if (!issueNumber) {
            return Promise.reject(new HTTPError(404));
        }
    }
    return issueNumber;
}

let issueNumberCache = {};

/**
 * Retrieve issue from Gitlab by issue number
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glIssueId
 *
 * @return {Object}
 */
async function fetchIssueByNumber(server, glProjectId, glIssueNumber) {
    let url = `/projects/${glProjectId}/issues/${glIssueNumber}`;
    return Transport.fetch(server, url);
}

export {
    importEvent,
    importHookEvent,
};
