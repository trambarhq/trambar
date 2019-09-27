import _ from 'lodash';
import Moment from 'moment';
import Crypto from 'crypto';
import ParseDiff from 'parse-diff';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as Transport from './transport.mjs';

// accessors
import Commit from '../accessors/commit.mjs';

/**
 * Import a commit from Gitlab
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} glBranch
 * @param  {String} glCommitID
 *
 * @return {Promise<Commit>}
 */
async function importCommit(db, server, repo, glBranch, glCommitID) {
    // first, check if the commit was previously imported
    const criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            commit: { id: glCommitID }
        })
    };
    const commit = await Commit.findOne(db, 'global', criteria, '*');
    if (commit) {
        return commit;
    }
    const repoLink = ExternalDataUtils.findLink(repo, server);
    const glProjectID = repoLink.project.id;
    const glCommit = await fetchCommit(server, glProjectID, glCommitID);
    const glDiff = await fetchDiff(server, glProjectID, glCommit.id);
    const commitNew = copyCommitProperties(null, server, repo, glBranch, glCommit, glDiff);
    const commitAfter = await Commit.insertOne(db, 'global', commitNew);
    return commitAfter;
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
    const changes = countChanges(glDiff);

    const commitChanges = _.cloneDeep(commit) || {};
    ExternalDataUtils.inheritLink(commitChanges, server, repo, {
        commit: {
            id: glCommit.id,
            parent_ids: glCommit.parent_ids,
        }
    });
    ExternalDataUtils.importProperty(commitChanges, server, 'initial_branch', {
        value: glBranch,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitChanges, server, 'title_hash', {
        value: hash(glCommit.title),
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitChanges, server, 'details.status', {
        value: glCommit.status,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitChanges, server, 'details.author_name', {
        value: glCommit.author_name,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitChanges, server, 'details.author_email', {
        value: glCommit.author_email,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitChanges, server, 'details.lines', {
        value: changes.lines,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitChanges, server, 'details.files', {
        value: changes.files,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitChanges, server, 'ptime', {
        value: Moment(glCommit.committed_date).toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(commitChanges, commit)) {
        return null;
    }
    commitChanges.itime = new String('NOW()');
    return commitChanges;
}

/**
 * Retrieve commit info from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 * @param  {String} glCommitID
 *
 * @return {Promise<Object>}
 */
async function fetchCommit(server, glProjectID, glCommitID) {
    const url = `/projects/${glProjectID}/repository/commits/${glCommitID}`;
    return Transport.fetch(server, url);
}

/**
 * Retrieve the diff of a commit with its parent
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 * @param  {String} glCommitID
 *
 * @return {Promise<Object>}
 */
async function fetchDiff(server, glProjectID, glCommitID) {
    const url = `/projects/${glProjectID}/repository/commits/${glCommitID}/diff`;
    return Transport.fetch(server, url);
}

/**
 * Parse the diff of a file in a commit
 *
 * @param  {Object} file
 *
 * @return {Object|null}
 */
function parseFileDiff(file) {
    let diff = file.diff;
    if (!diff) {
        return null;
    }
    if (diff.substr(0, 2) === '@@') {
        // context is missing (GitLab 11)
        let header1, header2;
        if (file.new_file) {
            header1 = `--- /dev/null\n`;
        } else {
            header1 = `--- a/${file.old_path}\n`;
        }
        if (file.deleted_file) {
            header2 = `+++ /dev/null\n`;
        } else {
            header2 = `+++ b/${file.new_path}\n`;
        }
        diff = header1 + header2 + diff;
    }
    return _.first(ParseDiff(diff));
}

/**
 * Return lists of files that were changed, added, removed, or renamed
 *
 * @param  {Object} glDiff
 */
function countChanges(glDiff) {
    const cf = {
        added: [],
        deleted: [],
        renamed: [],
        modified: [],
    };
    const cl = {
        added: 0,
        deleted: 0,
        modified: 0,
    };
    for (let file of glDiff) {
        // parse diff if there's one
        try {
            const diff = parseFileDiff(file);
            // record file disposition
            if (file.new_file) {
                cf.added.push(file.new_path);
            } else if (file.deleted_file) {
                cf.deleted.push(file.old_path);
            } else {
                let modified = false;
                // check if the file was renamed and modified
                if (diff) {
                    if (diff.additions > 0 || diff.deletions > 0) {
                        modified = true;
                    }
                }
                if (file.renamed_file) {
                    cf.renamed.push({
                        before: file.old_path,
                        after: file.new_path,
                    });
                }
                if (modified) {
                    cf.modified.push(file.new_path);
                }
            }

            // count lines added, removed, or modified
            if (diff) {
                if (diff.additions > 0 && diff.deletions > 0) {
                    const changes = _.flatten(_.map(diff.chunks, 'changes'));
                    let deleted = 0;
                    for (let change of changes) {
                        if (change.type === 'del') {
                            // remember how many lines were deleted in this run
                            cl.deleted++;
                            deleted++;
                        } else if (change.type === 'add') {
                            if (deleted > 0) {
                                // when an add follows a delete, treat it as modification
                                cl.deleted--;
                                cl.modified++;
                                deleted--;
                            } else {
                                // otherwise it's an add
                                cl.added++;
                            }
                        } else if (change.type === 'normal') {
                            // we've reached unchanged code--reset the counter
                            deleted = 0;
                        }
                    }
                } else if (diff.additions > 0) {
                    cl.added += diff.additions;
                } else if (diff.deletions > 0) {
                    cl.deleted += diff.deletions;
                }
            }
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.error(err);
            }
        }
    }
    return {
        files: cf,
        lines: cl,
    };
}

/**
 * Generate MD5 hash of text
 *
 * @param  {String} text
 *
 * @return {String}
 */
function hash(text) {
    const hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}

export {
    importCommit,
};
