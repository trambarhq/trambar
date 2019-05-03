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
    let criteria = {
        external_object: ExternalDataUtils.extendLink(server, repo, {
            commit: { id: glCommitID }
        })
    };
    let commit = await Commit.findOne(db, 'global', criteria, '*');
    if (!commit) {
        let repoLink = ExternalDataUtils.findLink(repo, server);
        let glProjectID = repoLink.project.id;

        console.log(`Retriving commit ${glCommitID}`);
        let glCommit = await fetchCommit(server, glProjectID, glCommitID);
        let glDiff = await fetchDiff(server, glProjectID, glCommit.id);
        let commitNew = copyCommitProperties(null, server, repo, glBranch, glCommit, glDiff);
        commit = await Commit.insertOne(db, 'global', commitNew);
    }
    return commit;
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
    let changes = countChanges(glDiff);

    let commitAfter = _.cloneDeep(commit) || {};
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
        value: changes.lines,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(commitAfter, server, 'details.files', {
        value: changes.files,
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
 * @param  {Number} glProjectID
 * @param  {String} glCommitID
 *
 * @return {Promise<Object>}
 */
async function fetchCommit(server, glProjectID, glCommitID) {
    let url = `/projects/${glProjectID}/repository/commits/${glCommitID}`;
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
    let url = `/projects/${glProjectID}/repository/commits/${glCommitID}/diff`;
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
    let cf = {
        added: [],
        deleted: [],
        renamed: [],
        modified: [],
    };
    let cl = {
        added: 0,
        deleted: 0,
        modified: 0,
    };
    for (let file of glDiff) {
        // parse diff if there's one
        try {
            let diff = parseFileDiff(file);
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
                    let changes = _.flatten(_.map(diff.chunks, 'changes'));
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
            console.log('Error encounter processing diff: ' + err.message);
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
    let hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}

export {
    importCommit,
};
