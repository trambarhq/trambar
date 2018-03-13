var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var ExternalObjectUtils = require('objects/utils/external-object-utils');

var PushReconstructor = require('gitlab-adapter/push-reconstructor');
var PushDecorator = require('gitlab-adapter/push-decorator');
var UserImporter = require('gitlab-adapter/user-importer');

// accessors
var Story = require('accessors/story');

module.exports = {
    importEvent,
};

/**
 * Import an activity log entry about a push
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
    var branch, headId, tailId, count;
    if (glEvent.push_data) {
        // version 10
        branch = glEvent.push_data.ref;
        headId = glEvent.push_data.commit_to;
        tailId = glEvent.push_data.commit_from;
        count = glEvent.push_data.commit_count;
    } else if (glEvent.data) {
        // version 9
        branch = _.last(_.split(glEvent.data.ref, '/'));
        headId = glEvent.data.after;
        tailId = glEvent.data.before;
        if (/^0+$/.test(tailId)) {
            // all zeros
            tailId = null;
        }
        count = glEvent.data.total_commits_count;
    }
    // retrieve all commits in the push
    return PushReconstructor.reconstructPush(db, server, repo, branch, headId, tailId, count).then((push) => {
        // look for component descriptions
        return PushDecorator.retrieveDescriptions(server, repo, push).then((components) => {
            var storyNew = copyPushProperties(null, server, repo, author, push, components, glEvent);
            return Story.insertOne(db, schema, storyNew);
        });
    });
}

/**
 * Copy properties of push
 *
 * @param  {Story|null} story
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} push
 * @param  {Array<Object>} components
 * @param  {Object} glEvent
 *
 * @return {Object|null}
 */
function copyPushProperties(story, server, repo, author, push, components, glEvent) {
    var storyType;
    if (push.forkId) {
        storyType = 'branch';
    } else if (!_.isEmpty(push.fromBranches)) {
        storyType = 'merge';
    } else {
        storyType = 'push';
    }

    var storyAfter = _.cloneDeep(story) || {};
    ExternalObjectUtils.inheritLink(storyAfter, server, repo, {
        commit: { ids: push.commitIds }
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'type', {
        value: storyType,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'user_ids', {
        value: [ author.id ],
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'role_ids', {
        value: author.role_ids,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.commit_before', {
        value: push.tailId,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.commit_after', {
        value: push.headId,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.lines', {
        value: _.pickBy(push.lines),    // don't include 0's
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.files', {
        value: _.pickBy(_.mapValues(push.files, 'length')),
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.components', {
        value: components,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.branch', {
        value: push.branch,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.from_branches', {
        value: !_.isEmpty(push.fromBranches) ? push.fromBranches : undefined,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'ptime', {
        value: Moment(glEvent.created_at).toISOString(),
        overwrite: 'always',
    });
    return storyAfter;
}
