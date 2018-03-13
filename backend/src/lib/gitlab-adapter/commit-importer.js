var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Crypto = require('crypto');
var ParseDiff = require('parse-diff');
var ExternalDataUtils = require('objects/utils/external-data-utils');

var Transport = require('gitlab-adapter/transport');

// accessors
var Commit = require('accessors/commit');

module.exports = {
    importCommit,
};

/**
 * Import a commit from Gitlab
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} glBranch
 * @param  {String} glCommitId
 *
 * @return {Promise<Commit>}
 */
function importCommit(db, server, repo, glBranch, glCommitId) {
    // first, check if the commit was previously imported
    var criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            commit: { id: glCommitId }
        })
    };
    return Commit.findOne(db, 'global', criteria, '*').then((commit) => {
        if (commit) {
            return commit;
        }
        var repoLink = ExternalDataUtils.findLink(repo, server);
        var glProjectId = repoLink.project.id;
        console.log(`Retriving commit ${glCommitId}`);
        return fetchCommit(server, glProjectId, glCommitId).then((glCommit) => {
            return fetchDiff(server, glProjectId, glCommit.id).then((glDiff) => {
                var commitNew = copyCommitProperties(null, server, repo, glBranch, glCommit, glDiff);
                return Commit.insertOne(db, 'global', commitNew);
            });
        });
    });
};

/**
 * Copy information about the commit,
 *
 * @param  {Commit|null} commit
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} glBranch
 * @param  {Object} glCommit
 * @param  {Object} glDiff
 *
 * @return {Commit}
 */
function copyCommitProperties(commit, server, repo, glBranch, glCommit, glDiff) {
    var lineChanges = {
        added: glCommit.stats.additions,
        deleted: glCommit.stats.deletions,
    };
    var fileChanges = countChanges(glDiff);

    var commitAfter = _.cloneDeep(commit) || {};
    ExternalDataUtils.inheritLink(commitAfter, server, repo, {
        commit: {
            id: glCommit.id,
            parent_ids: glCommit.parent_ids,
        }
    });
    ExternalDataUtils.importProperty(commitAfter, server, 'initial_branch', {
        value: glBranch,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitAfter, server, 'title_hash', {
        value: hash(glCommit.title),
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitAfter, server, 'details.status', {
        value: glCommit.status,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitAfter, server, 'details.author_name', {
        value: glCommit.author_name,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitAfter, server, 'details.author_email', {
        value: glCommit.author_email,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitAfter, server, 'details.lines', {
        value: lineChanges,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitAfter, server, 'details.files', {
        value: fileChanges,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitAfter, server, 'ptime', {
        value: Moment(glCommit.committed_date).toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(commitAfter, commit)) {
        return commit;
    }
    commitAfter.itime = new String('NOW()');
    return commitAfter;
}

/**
 * Retrieve commit info from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {String} glCommitId
 *
 * @return {Promise<Object>}
 */
function fetchCommit(server, glProjectId, glCommitId) {
    var url = `/projects/${glProjectId}/repository/commits/${glCommitId}`;
    return Transport.fetch(server, url);
}

/**
 * Retrieve the diff of a commit with its parent
 *
 * @param  {Server} server
 * @param  {Number} glProjectId
 * @param  {String} glCommitId
 *
 * @return {Promise<Object>}
 */
function fetchDiff(server, glProjectId, glCommitId) {
    var url = `/projects/${glProjectId}/repository/commits/${glCommitId}/diff`;
    return Transport.fetch(server, url);
}

/**
 * Return lists of files that were changed, added, removed, or renamed
 *
 * @param  {Object} glDiff
 */
function countChanges(glDiff) {
    var cf = {
        added: [],
        deleted: [],
        renamed: [],
        modified: [],
    };
    return _.transform(glDiff, (cf, file) => {
        if (file.new_file) {
            cf.added.push(file.new_path);
        } else if (file.deleted_file) {
            cf.deleted.push(file.old_path);
        } else if (file.renamed_file) {
            cf.renamed.push({
                before: file.old_path,
                after: file.new_path,
            });
            if (file.diff) {
                // check if the file was renamed and modified
                var diff = _.first(ParseDiff(file.diff));
                if (diff) {
                    if (diff.additions || diff.deletions) {
                        cf.modified.push(file.new_path);
                    }
                }
            }
        } else {
            cf.modified.push(file.new_path);
        }
    }, cf);
}

/**
 * Generate MD5 hash of text
 *
 * @param  {String} text
 *
 * @return {String}
 */
function hash(text) {
    var hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}
