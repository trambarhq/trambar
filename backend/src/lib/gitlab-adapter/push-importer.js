var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var LinkUtils = require('objects/utils/link-utils');

var Import = require('external-services/import');
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
            var repoLink = LinkUtils.find(repo, { server, relation: 'project' });
            var commitLink = LinkUtils.extend(repoLink, {
                commit: { ids: push.commitIds }
            });
            var storyNew = copyPushProperties(null, author, push, components, glEvent, commitLink);
            return Story.insertOne(db, schema, storyNew);
        });
    });
}

/**
 * Copy properties of push
 *
 * @param  {Story|null} story
 * @param  {User} author
 * @param  {Object} push
 * @param  {Array<Object>} components
 * @param  {Object} glEvent
 * @param  {Object} link
 *
 * @return {Object|null}
 */
function copyPushProperties(story, author, push, components, glEvent, link) {
    var storyAfter = _.cloneDeep(story) || {};
    Import.join(storyAfter, link);
    var storyType;
    if (push.forkId) {
        storyType = 'branch';
    } else if (!_.isEmpty(push.fromBranches)) {
        storyType = 'merge';
    } else {
        storyType = 'push';
    }
    _.set(storyAfter, 'type', storyType);
    _.set(storyAfter, 'user_ids', [ author.id ]);
    _.set(storyAfter, 'role_ids', author.role_ids);
    _.set(storyAfter, 'published', true);
    _.set(storyAfter, 'ptime', Moment(glEvent.created_at).toISOString());
    _.set(storyAfter, 'public', true);
    _.set(storyAfter, 'details.commit_before', push.tailId);
    _.set(storyAfter, 'details.commit_after', push.headId);
    _.set(storyAfter, 'details.lines', _.pickBy(push.lines));   // don't include 0's
    _.set(storyAfter, 'details.files', _.pickBy(_.mapValues(push.files, 'length')));
    _.set(storyAfter, 'details.components', components);
    _.set(storyAfter, 'details.branch', push.branch);
    if (!_.isEmpty(push.fromBranches)) {
        _.set(storyAfter, 'details.from_branches', push.fromBranches);
    }
    if (_.isEqual(story, storyAfter)) {
        return null;
    }
    return storyAfter;
}
