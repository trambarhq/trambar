import _ from 'lodash';
import * as TaskLog from 'task-log';

import * as CommitImporter from 'gitlab-adapter/commit-importer';

/**
 * Reconstruct a push
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} type
 * @param  {String} branch
 * @param  {String} headID
 * @param  {String} tailID
 * @param  {Number} count
 *
 * @return {Promise<Object>}
 */
async function reconstructPush(db, server, repo, type, branch, headID, tailID, count) {
    let commits = await importCommits(db, server, repo, branch, headID, tailID, count);
    let chain = getCommitChain(commits, headID, branch);
    // merge changes of commits
    let lines = mergeLineChanges(chain);
    let files = mergeFileChanges(chain);
    // see if the commits were initially pushed into a different branch
    let fromBranches = findSourceBranches(commits, branch);
    let commitIDs = _.keys(commits);
    return { headID, tailID, commitIDs, lines, files, type, branch, fromBranches };
}

/**
 * Import a certain number of commits, starting from the head moving backward
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} branch
 * @param  {String} headID
 * @param  {String} tailID
 * @param  {Number} count
 *
 * @return {Promise<Object<Commits>>}
 */
async function importCommits(db, server, repo, branch, headID, tailID, count) {
    let taskLog = TaskLog.start('gitlab-push-import', {
        server_id: server.id,
        server: server.name,
        repo_id: repo.id,
        repo: repo.name,
        branch: branch,
    });
    try {
        let queue = [ headID ];
        let commits = {};
        let commitIDs = [];
        while (queue.length > 0) {
            let commitID = queue.shift();
            if (commits[commitID] || commitID === tailID) {
                continue;
            }
            let commit = await CommitImporter.importCommit(db, server, repo, branch, commitID);
            commits[commitID] = commit;
            commitIDs.push(commitID);
            // add parents to queue
            let parentIDs = getParentIDs(commit);
            for (let parentID of parentIDs) {
                queue.push(parentID);
            }

            let retrieved = commitIDs.length;
            let total = count;
            if (retrieved + queue.length > total) {
                total = retrieved + queue.length;
            }
            taskLog.report(retrieved, total, { added: commitIDs });
        }
        await taskLog.finish();
        return commits;
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

function mergeLineChanges(chain) {
    let pl = {
        added: 0,
        deleted: 0,
        modified: 0,
    };
    for (let commit in chain) {
        let cl = commit.details.lines;
        if (cl) {
            pl.added += cl.added;
            pl.deleted += cl.deleted;
            pl.modified += cl.modified;
        }
    }
    return pl;
}

function mergeFileChanges(chain) {
    let pf = {
        added: [],
        deleted: [],
        modified: [],
        renamed: [],
    };
    for (let commit in chain) {
        let cf = commit.details.files;
        if (cf) {
            for (let path in cf.added) {
                if (!_.includes(pf.added, path)) {
                    pf.added.push(path);
                }
            }
            for (let path in cf.deleted) {
                // if the file was deleted within this push, ignore it
                if (_.includes(pf.added, path)) {
                    _.pull(pf.added, path);
                } else {
                    pf.added.push(path);
                }
            }
            for (let path in cf.renamed) {
                // if the file was renamed within this push, treat it
                // as an addition under the new name
                if (_.includes(pf.added, path.before)) {
                    _.pull(pf.added, path.before);
                    pf.added.push(path.after);
                } else {
                    // if the file was renamed previously within this push,
                    // don't count the previous action
                    _.remove(pf.renamed, { after: path.before });
                    pf.renamed.push(path);
                }
            }
            for (let path in cf.modified) {
                // if the file was added by this push, don't treat it
                // as a modification
                if (!_.includes(pf.added, path)) {
                    if (!_.includes(pf.modified, path)) {
                        pf.modified.push(path);
                    }
                }
            }
        }
    }
    return pf;
}

function findSourceBranches(commits, branch) {
    let list = [];
    for (let commit of commits) {
        if (commit.initial_branch !== branch) {
            if (!_.includes(list, commit.initial_branch)) {
                list.push(commit.initial_branch);
            }
        }
    }
    return list;
}

/**
 * Return the parent ids of a commit (which, for the sake of consistency,
 * are stored in a link object in external, alongside the commit id)
 *
 * @param  {Commit} commit
 *
 * @return {Array<String>}
 */
function getParentIDs(commit) {
    let commitLink = _.find(commit.external, { type: 'gitlab' });
    let commitID = commitLink.commit.id;
    let parentIDs = commitLink.commit.parent_ids;
    // sanity check
    if (_.includes(parentIDs, commitID)) {
        parentIDs = _.without(parentIDs, commitID);
    }
    return parentIDs;
}

/**
 * Get a linear list of commits, choosing the first parent when a fork is encountered
 *
 * @param  {Object<Commit>} commits
 * @param  {String} headID
 * @param  {String} branch
 *
 * @return {Array<Commit>}
 */
function getCommitChain(commits, headID, branch) {
    let chain = [];
    let id = headID;
    do {
        let commit = commits[id];
        if (commit) {
            let parentIDs = getParentIDs(commit);
            id = parentIDs[0];
            // include only commits that are checked directly into branch
            if (commit.initial_branch === branch) {
                chain.push(commit);
            }
        } else {
            id = null;
        }
    } while(id);
    return chain;
}

export {
    reconstructPush,
};
