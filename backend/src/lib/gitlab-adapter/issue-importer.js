import _ from 'lodash';
import Promise from 'bluebird';
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
function importEvent(db, system, server, repo, project, author, glEvent) {
    var schema = project.name;
    var repoLink = ExternalDataUtils.findLink(repo, server);
    return fetchIssue(server, repoLink.project.id, glEvent.target_id).then((glIssue) => {
        // the story is linked to both the issue and the repo
        var criteria = {
            external_object: ExternalDataUtils.extendLink(server, repo, {
                issue: { id: glIssue.id }
            }),
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            return AssignmentImporter.findIssueAssignments(db, server, glIssue).then((assignments) => {
                var storyAfter = copyIssueProperties(story, system, server, repo, author, assignments, glIssue);
                if (storyAfter === story) {
                    return story;
                }
                return Story.saveOne(db, schema, storyAfter).then((story) => {
                    return AssignmentImporter.importAssignments(db, server, project, repo, story, assignments);
                }).then((reactions) => {
                    return story;
                });
            }).catch(AssignmentImporter.ObjectMovedError, (err) => {
                // the issue has been moved to a different repo--delete the
                // story if it was imported
                if (!story) {
                    return null;
                }
                var storyAfter = { id: story.id, deleted: true };
                return Story.saveOne(db, schema, storyAfter).then((story) => {
                    return null;
                });
            });
        });
    });
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
function importHookEvent(db, system, server, repo, project, author, glHookEvent) {
    if (glHookEvent.object_attributes.action === 'update') {
        // construct a glIssue object from data in hook event
        var repoLink = ExternalDataUtils.findLink(repo, server);
        var glIssue = _.omit(glHookEvent.object_attributes, 'action');
        glIssue.project_id = repoLink.project.id;
        glIssue.labels = _.map(glHookEvent.labels, 'title');
        if (glHookEvent.assignee) {
            glIssue.assignee = _.clone(glHookEvent.assignee);
            glIssue.assignee.id = glHookEvent.object_attributes.assignee_id;
        }

        // find existing story
        var schema = project.name;
        var criteria = {
            external_object: ExternalDataUtils.extendLink(server, repo, {
                issue: { id: glIssue.id }
            }),
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            if (!story) {
                throw new Error('Story not found');
            }
            return AssignmentImporter.findIssueAssignments(db, server, glIssue).then((assignments) => {
                var storyAfter = copyIssueProperties(story, system, server, repo, author, assignments, glIssue);
                if (storyAfter === story) {
                    return story;
                }
                return Story.updateOne(db, schema, storyAfter).then((story) => {
                    return AssignmentImporter.importAssignments(db, server, project, repo, story, assignments);
                }).then((reactions) => {
                    return story;
                });
            }).catch(AssignmentImporter.ObjectMovedError, (err) => {
                // the issue has been moved to a different repo--delete the
                // story if it was imported
                if (!story) {
                    return null;
                }
                var storyAfter = { id: story.id, deleted: true };
                return Story.saveOne(db, schema, storyAfter).then((story) => {
                    return null;
                });
            });
        }).catch((err) => {
            return null;
        });
    } else {
        return Promise.resolve(false);
    }
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
 * @param  {User} author
 * @param  {Array<Object>} assignments
 * @param  {Object} glIssue
 *
 * @return {Story}
 */
function copyIssueProperties(story, system, server, repo, author, assignments, glIssue) {
    var descriptionTags = TagScanner.findTags(glIssue.description);
    var labelTags = _.map(glIssue.labels, (label) => {
        return `#${_.replace(label, /\s+/g, '-')}`;
    });
    var tags = _.union(descriptionTags, labelTags);
    var langCode = Localization.getDefaultLanguageCode(system);

    var storyAfter = _.cloneDeep(story) || {};
    ExternalDataUtils.inheritLink(storyAfter, server, repo, {
        issue: {
            id: glIssue.id,
            number: glIssue.iid,
        }
    });
    var exported = !!storyAfter.etime;
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
    ExternalDataUtils.importProperty(storyAfter, server, 'user_ids', {
        value: [ author.id ],
        overwrite: 'always',
        ignore: exported,
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'role_ids', {
        value: author.role_ids,
        overwrite: 'always',
        ignore: exported,
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.title', {
        value: glIssue.title,
        overwrite: 'match-previous:title',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.labels', {
        value: glIssue.labels,
        overwrite: 'match-previous:labels',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.state', {
        value: glIssue.state,
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
function fetchIssue(server, glProjectId, glIssueId) {
    // Gitlab wants the issue IID (i.e. issue number), which unfortunately isn't
    // included in the activity log entry
    return getIssueNumber(server, glProjectId, glIssueId).then((glIssueNumber) => {
        var url = `/projects/${glProjectId}/issues/${glIssueNumber}`;
        return Transport.fetch(server, url);
    });
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
function getIssueNumber(server, glProjectId, glIssueId) {
    var baseURL = _.get(server, 'settings.oauth.base_url');
    var issueNumber = _.get(issueNumberCache, [ baseURL, glProjectId, glIssueId ]);
    if (issueNumber) {
        return Promise.resolve(issueNumber);
    }
    var url = `/projects/${glProjectId}/issues`;
    return Transport.fetchEach(server, url, {}, (glIssue) => {
        var issueId = glIssue.id;
        var issueNumber = glIssue.iid;
        _.set(issueNumberCache, [ baseURL, glProjectId, issueId ], issueNumber);
    }).then(() => {
        var issueNumber = _.get(issueNumberCache, [ baseURL, glProjectId, glIssueId ]);
        if (!issueNumber) {
            return Promise.reject(new HTTPError(404));
        }
        return issueNumber;
    });
}

var issueNumberCache = {};

/**
 * Retrieve issue from Gitlab by issue number
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {Number} glIssueId
 *
 * @return {Object}
 */
function fetchIssueByNumber(server, glProjectId, glIssueNumber) {
    var url = `/projects/${glProjectId}/issues/${glIssueNumber}`;
    return Transport.fetch(server, url);
}

export {
    importEvent,
    importHookEvent,
};
