import _ from 'lodash';
import Moment from 'moment';
import HTTPError from 'errors/http-error';
import * as TagScanner from 'utils/tag-scanner';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

import * as Transport from 'gitlab-adapter/transport';
import * as AssignmentImporter from 'gitlab-adapter/assignment-importer';

// accessors
import Reaction from 'accessors/reaction';
import Story from 'accessors/story';

/**
 * Import an activity log entry about an merge request
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
    let glMergeRequest = await fetchMergeRequest(server, repoLink.project.id, glEvent.target_id);
    // the story is linked to both the merge request and the repo
    let criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            merge_request: { id: glMergeRequest.id }
        })
    };
    let story = await Story.findOne(db, schema, criteria, '*');
    let assignments = await AssignmentImporter.findMergeRequestAssignments(db, server, glMergeRequest);
    let opener = (glEvent.action_name === 'opened') ? author : null;
    let storyAfter = copyMergeRequestProperties(story, system, server, repo, opener, assignments, glMergeRequest);
    if (storyAfter !== story) {
        story = await Story.saveOne(db, schema, storyAfter);
    }
    let reactions = await AssignmentImporter.importAssignments(db, server, project, repo, story, assignments);
    return story;
}

/**
 * Handle a Gitlab hook event concerning an merge request
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story|null>}
 */
async function importHookEvent(db, system, server, repo, project, author, glHookEvent) {
    if (glHookEvent.object_attributes.action !== 'update') {
        return false;
    }
    // construct a glMergeRequest object from data in hook event
    let repoLink = ExternalDataUtils.findLink(repo, server);
    let glMergeRequest = _.omit(glHookEvent.object_attributes, 'action');
    glMergeRequest.project_id = repoLink.project.id;
    glMergeRequest.labels = _.map(glHookEvent.labels, 'title');
    if (glHookEvent.assignee) {
        glMergeRequest.assignee = _.clone(glHookEvent.assignee);
        glMergeRequest.assignee.id = glHookEvent.object_attributes.assignee_id;
    }

    // find existing story
    let schema = project.name;
    let criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            merge_request: { id: glMergeRequest.id }
        }),
    };
    let story = Story.findOne(db, schema, criteria, '*');
    if (!story) {
        throw new HTTPError(404, 'Story not found');
    }
    let assignments = await AssignmentImporter.findMergeRequestAssignments(db, server, glMergeRequest);
    // the author of the hook event isn't the merge request's author,
    // hence we're passing null here
    let opener = null;
    let storyAfter = copyMergeRequestProperties(story, system, server, repo, opener, assignments, glMergeRequest);
    if (storyAfter !== story) {
        story = await Story.updateOne(db, schema, storyAfter);
    }
    let reactions = AssignmentImporter.importAssignments(db, server, project, repo, story, assignments);
    return story;
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
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} opener
 * @param  {Array<Object>} assignments
 * @param  {Object} glMergeRequest
 *
 * @return {Story}
 */
function copyMergeRequestProperties(story, system, server, repo, opener, assignments, glMergeRequest) {
    let descriptionTags = TagScanner.findTags(glMergeRequest.description);
    let labelTags = _.map(glMergeRequest.labels, (label) => {
        return `#${_.replace(label, /\s+/g, '-')}`;
    });
    let tags = _.union(descriptionTags, labelTags);
    let defLangCode = _.get(system, [ 'settings', 'input_languages', 0 ]);

    let storyAfter = _.cloneDeep(story) || {};
    ExternalDataUtils.inheritLink(storyAfter, server, repo, {
        merge_request: {
            id: glMergeRequest.id,
            number: glMergeRequest.iid,
        }
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: 'merge-request',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'tags', {
        value: tags,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'language_codes', {
        value: [ defLangCode ],
        overwrite: 'always',
    });
    if (opener) {
        ExternalDataUtils.importProperty(storyAfter, server, 'user_ids', {
            value: [ opener.id ],
            overwrite: 'always',
        });
        ExternalDataUtils.importProperty(storyAfter, server, 'role_ids', {
            value: opener.role_ids,
            overwrite: 'always',
        });
    }
    ExternalDataUtils.importProperty(storyAfter, server, 'details.state', {
        value: glMergeRequest.state,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.branch', {
        value: glMergeRequest.target_branch,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.source_branch', {
        value: glMergeRequest.source_branch,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.labels', {
        value: glMergeRequest.labels,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.milestone', {
        value: _.get(glMergeRequest, 'milestone.title'),
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.title', {
        value: glMergeRequest.title,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'public', {
        value: !glMergeRequest.confidential,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'ptime', {
        value: Moment(new Date(glMergeRequest.created_at)).toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(storyAfter, story)) {
        return story;
    }
    storyAfter.itime = new String('NOW()');
    return storyAfter;
}

/**
 * Retrieve merge request from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glMergeRequestNumber
 *
 * @return {Object}
 */
async function fetchMergeRequest(server, glProjectId, glMergeRequestNumber) {
    let url = `/projects/${glProjectId}/merge_requests/${glMergeRequestNumber}`;
    return Transport.fetch(server, url);
}

export {
    importEvent,
    importHookEvent,
};
