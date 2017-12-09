var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Crypto = require('crypto');
var ParseDiff = require('parse-diff');

var Import = require('external-services/import');
var Transport = require('gitlab-adapter/transport');

// accessors
var Commit = require('accessors/commit');

exports.importCommit = importCommit;

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
        external_object: {
            commit: { id: glCommitId }
        }
    };
    return Commit.findOne(db, 'global', criteria, '*').then((commit) => {
        var repoLink = Import.Link.find(repo, server);
        if (commit) {
            // make sure the commit is linked properly, in case the commit
            // originated from a different server
            var existingCommitLink = _.find(commit.external, criteria.external_object);
            var commitLink = Import.Link.create(server, {
                commit: existingCommitLink.commit
            });
            var link = Import.Link.merge(commitLink, repoLink);
            var commitAfter = _.cloneDeep(commit);
            Import.join(commitAfter, link);
            if (!_.isEqual(commit, commitAfter)) {
                return Commit.updateOne(db, 'global', commitAfter);
            }
            return commit;
        }
        console.log(`Retriving commit ${glCommitId}`);
        return fetchCommit(server, repoLink.project.id, glCommitId).then((glCommit) => {
            return fetchDiff(server, repoLink.project.id, glCommit.id).then((glDiff) => {
                var commitLink = Import.Link.create(server, {
                    commit: {
                        id: glCommit.id,
                        parent_ids: glCommit.parent_ids
                    }
                });
                // commits are also linked to the Gitlab project
                var link = Import.Link.merge(commitLink, repoLink);
                var commitNew = copyCommitProperties(null, glCommit, glDiff, glBranch, link);
                return Commit.insertOne(db, 'global', commitNew);
            });
        });
    });
};

/**
 * Copy information about the commit,
 *
 * @param  {Commit|null} commit
 * @param  {Object} glCommit
 * @param  {Object} glDiff
 * @param  {String} glBranch
 * @param  {Object} link
 *
 * @return {Object|null}
 */
function copyCommitProperties(commit, glCommit, glDiff, glBranch, link) {
    var commitAfter = _.cloneDeep(commit) || {};
    Import.join(commitAfter, link);
    _.set(commitAfter, 'initial_branch', glBranch);
    _.set(commitAfter, 'title_hash', hash(glCommit.title));
    _.set(commitAfter, 'ptime', Moment(glCommit.committed_date).toISOString());
    _.set(commitAfter, 'details.status', glCommit.status);
    _.set(commitAfter, 'details.author_name', glCommit.author_name);
    _.set(commitAfter, 'details.author_email', glCommit.author_email);
    _.set(commitAfter, 'details.lines.added', glCommit.stats.additions);
    _.set(commitAfter, 'details.lines.deleted', glCommit.stats.deletions);
    _.set(commitAfter, 'details.files', countChanges(glDiff));
    if (_.isEqual(commit, commitAfter)) {
        return null;
    }
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
