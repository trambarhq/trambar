var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Localization = require('localization');
var ExternalDataUtils = require('objects/utils/external-data-utils');

var PushReconstructor = require('gitlab-adapter/push-reconstructor');
var PushDecorator = require('gitlab-adapter/push-decorator');
var UserImporter = require('gitlab-adapter/user-importer');

// accessors
var Story = require('accessors/story');
var System = require('accessors/system');

module.exports = {
    importEvent,
};

/**
 * Import an activity log entry about a push
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
    var branch, headId, tailId, type, count;
    if (glEvent.push_data) {
        // version 10
        branch = glEvent.push_data.ref;
        type = glEvent.push_data.ref_type;
        headId = glEvent.push_data.commit_to;
        tailId = glEvent.push_data.commit_from;
        count = glEvent.push_data.commit_count;
    } else if (glEvent.data) {
        // version 9
        var refParts = _.split(glEvent.data.ref, '/');
        branch = _.last(refParts);
        type = /^tags$/.test(refParts[1]) ? 'tag' : 'branch';
        headId = glEvent.data.after;
        tailId = glEvent.data.before;
        if (/^0+$/.test(tailId)) {
            // all zeros
            tailId = null;
        }
        count = glEvent.data.total_commits_count;
    }
    // retrieve all commits in the push
    return PushReconstructor.reconstructPush(db, server, repo, type, branch, headId, tailId, count).then((push) => {
        return System.findOne(db, 'global', { deleted: false }, 'settings').then((system) => {
            // look for component descriptions
            var languageCode = Localization.getDefaultLanguageCode(system);
            return getDefaultLanguage(db).then((languageCode) => {
                return PushDecorator.retrieveDescriptions(server, repo, push, languageCode).then((components) => {
                    var storyNew = copyPushProperties(null, system, server, repo, author, push, components, glEvent);
                    return Story.insertOne(db, schema, storyNew);
                });
            });
        });
    });
}

/**
 * Copy properties of push
 *
 * @param  {Story|null} story
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} push
 * @param  {Array<Object>} components
 * @param  {Object} glEvent
 *
 * @return {Story}
 */
function copyPushProperties(story, system, server, repo, author, push, components, glEvent) {
    var storyType;
    if (push.forkId) {
        if (push.type === 'tag') {
            storyType = 'tag';
        } else {
            storyType = 'branch';
        }
    } else if (!_.isEmpty(push.fromBranches)) {
        storyType = 'merge';
    } else {
        storyType = 'push';
    }
    var defLangCode = _.get(system, [ 'settings', 'input_languages', 0 ]);

    var storyAfter = _.cloneDeep(story) || {};
    ExternalDataUtils.inheritLink(storyAfter, server, repo, {
        commit: { ids: push.commitIds }
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: storyType,
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
    ExternalDataUtils.importProperty(storyAfter, server, 'details.commit_before', {
        value: push.tailId,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.commit_after', {
        value: push.headId,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.lines', {
        value: _.pickBy(push.lines),    // don't include 0's
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.files', {
        value: _.pickBy(_.mapValues(push.files, 'length')),
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.components', {
        value: components,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.branch', {
        value: push.branch,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.from_branches', {
        value: !_.isEmpty(push.fromBranches) ? push.fromBranches : undefined,
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
        value: Moment(glEvent.created_at).toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(storyAfter, story)) {
        return story;
    }
    storyAfter.itime = new String('NOW()');
    return storyAfter;
}
