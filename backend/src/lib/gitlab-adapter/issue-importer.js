var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TagScanner = require('utils/tag-scanner');
var ExternalDataUtils = require('objects/utils/external-data-utils');

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
    var repoLink = ExternalDataUtils.findLink(repo, server);
    return fetchIssue(server, repoLink.project.id, glEvent.target_id).then((glIssue) => {
        // the story is linked to both the issue and the repo
        var criteria = {
            external_object: ExternalDataUtils.extendLink(server, repo, {
                issue: { id: glIssue.id }
            }),
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            var storyAfter = copyIssueProperties(story, server, repo, author, glIssue);
            if (storyAfter === story) {
                return story;
            }
            return Story.saveOne(db, schema, storyAfter);
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
        var criteria = {
            external_object: ExternalDataUtils.extendLink(server, repo, {
                issue: { id: glIssue.id }
            }),
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            if (!story) {
                throw new Error('Story not found');
            }
            var storyAfter = copyIssueProperties(story, server, repo, author, glIssue);
            if (storyAfter === story) {
                return story;
            }
            return Story.updateOne(db, schema, storyAfter);
        }).then((story) => {
            return importAssignments(db, server, project, repo, story, glIssue).return(story);
        }).catch((err) => {
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
 * @param  {Object} glIssue
 *
 * @return {Promise<Array<Reaction>>}
 */
function importAssignments(db, server, project, repo, story, glIssue) {
    var schema = project.name;
    // find existing assignments
    var criteria = {
        story_id: story.id,
        type: 'assignment',
        external_object: ExternalDataUtils.extendLink(server, repo, {
            issue: { id: glIssue.id }
        }),
    };
    return Reaction.find(db, schema, criteria, 'user_id').then((reactions) => {
        return Promise.mapSeries(glIssue.assignees, (glUser) => {
            return UserImporter.findUser(db, server, glUser).then((assignee) => {
                if (!_.some(reactions, { user_id: assignee.id })) {
                    var reactionNew = copyAssignmentProperties(null, server, story, assignee, glIssue);
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
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} glIssue
 *
 * @return {Story}
 */
function copyIssueProperties(story, server, repo, author, glIssue) {
    var descriptionTags = TagScanner.findTags(glIssue.description);
    var labelTags = _.map(glIssue.labels, (label) => {
        return `#${_.replace(label, /\s+/g, '-')}`;
    });
    var tags = _.union(descriptionTags, labelTags);

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
    // title is imported only if issue isn't confidential
    ExternalDataUtils.importProperty(storyAfter, server, 'details.title', {
        value: (glIssue.confidential) ? undefined : glIssue.title,
        overwrite: 'match-previous:title',
        ignore: exported && glIssue.confidential,
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
 * Copy certain properties of the issue into the assignment reaction
 *
 * @param  {Reaction|null} reaction
 * @param  {Server} server
 * @param  {Story} story
 * @param  {User} assignee
 * @param  {Object} glIssue
 *
 * @return {Reaction}
 */
function copyAssignmentProperties(reaction, server, story, assignee, glIssue) {
    var reactionAfter = _.cloneDeep(reaction) || {};
    ExternalDataUtils.inheritLink(reactionAfter, server, story);
    ExternalDataUtils.importProperty(reactionAfter, server, 'type', {
        value: 'assignment',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'story_id', {
        value: story.id,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'user_id', {
        value: assignee.id,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(reactionAfter, server, 'ptime', {
        value: Moment(new Date(glIssue.updated_at)).toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(reactionAfter, reaction)) {
        return reaction;
    }
    reactionAfter.itime = new String('NOW()');
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
    // Gitlab wants the issue IID or issue number, which unfortunately isn't
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
