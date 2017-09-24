var _ = require('lodash');
var Promsie = require('bluebird');
var ParseDiff = require('parse-diff');

var Transport = require('gitlab-adapter/transport');

exports.retrievePush = retrievePush;

/**
 * Fetch all commits in the push
 *
 * @param  {Server} server
 * @param  {Repo} repo
 *
 * @return {Promise}
 */
function retrievePush(server, repo, ref, headId, tailId, count) {
    var push = new Push(ref, headId, tailId, count);
    // get the basic info of all commit
    return retrieveCommit(server, repo, headId).then((commit) => {
        push.head = commit;
        // retrieve diffs along the shortest path to the tail
        // (i.e. the head prior to the push)
        return retrieveDiff(server, repo, commit).then(() => {
            // combine changes from head to tail
            mergeCommits(push);
            return push;
        });
    });
};

/**
 * Fetch basic information about a commit from the server, then
 * fetch the parent commits
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} id
 *
 * @return {Promise<Commit>}
 */
function retrieveCommit(server, repo, id) {
    var commit = this.commits[id];
    if (commit) {
        return Promise.resolve(commit);
    }
    commit = this.commits[id] = new Commit(id);

    var url = `/projects/${repo.external_id}/repository/commits/${id}`;
    return Transport.fetch(server, url).then((info) => {
        this.author = info.author_email;
        this.date = info.committed_date;
        this.lines.added = info.stats.addition;
        this.lines.deleted = info.stats.deletion;
        return Promise.map(info.parent_ids, (parentId) => {
            return retrieveCommit(server, url, parentId);
        }).then((commits) => {
            commit.parents = commits;
            return commit;
        });
    });
};

/**
 * Retrieve the diff between the given commit and the one ahead of it
 * and stick the info into the commit object
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Commit} commit
 *
 * @return {Promise}
 */
function retrieveDiff(server, repo, commit) {
    if (!commit.parents) {
        // commit is actually the tail
        return Promise.resolve();
    }
    var url = `/projects/${repo.external_id}/repository/commits/${hash}/diff`;
    return Transport.fetch(server, url).then((info) => {
        var cf = commit.files;
        _.each(info, (file) => {
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
        });
    }).then(() => {
        var parentCommit;
        if (commit.parents.length === 1) {
            parentCommit = commit.parents[0];
        } else {
            // see which of the parents has a shorter path
            var distances = _.map(commit.parents, this.getShortestPath);
            var minDistance = _.min(distances);
            var index = _.indexOf(distances, minDistance);
            parentCommit = commit.parents[index];
        }
        // fetch diff of parent
        return retrieveDiff(server, repo, parentCommit);
    });
};

/**
 * Return the number of commits between given commit and the tail
 *
 * @return {Number}
 */
function getShortestPath(commit) {
    if (!commit.parents) {
        return 0;
    }
    var distances = _.map(commit.parents, getShortestPath);
    var minDistance = _.min(distances);
    return minDistance + 1;
};

/**
 * Return array of commit objects where we have the diff
 *
 * @param  {Push} push
 *
 * @return {Array<Commit>}
 */
function getCommitChain(push) {
    var commits = [];
    var commit = push.head;
    while (commit) {
        commits.push(commit);
        commit = null;
        if (commit.parents) {
            var parents = commit.parents;
            for (var i = 0; i < parents.length; i++) {
                if (parents[i].files) {
                    commit = parents[i];
                    break;
                }
            }
        }
    }
    return commits.reverse();
};

/**
 * Merge stats of commits, going from the tail to the new head
 */
function mergeCommits(push) {
    var commits = getCommitChain(push);
    var pl = push.lines;
    var pf = push.files;
    _.each(commits, (commit) => {
        var cl = commit.lines;
        var cf = commit.files;
        pl.added += cl.added;
        pl.deleted += cl.deleted;

        _.each(cf.added, (path) => {
            if (!_.includes(pf.added(path))) {
                pf.added.push(path);
            }
        });
        _.each(cf.deleted, (path) => {
            // if the file was deleted within this push, ignore it
            if (_.includes(pf.added, path)) {
                _.pull(pf.added, path);
            } else {
                pf.added.push(path);
            }
        });
        _.each(cf.renamed, (path) => {
            // if the file was renamed within this push, treat it
            // as an addition under the new name
            if (_.includes(pf.added, path.before)) {
                _.pull(pf.added, path.before);
                pf.added.push(path.after);
            } else {
                // if the file was renamed previously within this push,
                // don't count the previous action
                _.pullBy(pf.renamed, { after: path.before });
                pf.renamed.push(path);
            }
        });
        _.each(cf.modified, (path) => {
            // if the file was added by this push, don't treat it
            // as a modification
            if (!_.includes(pf.added, path)) {
                pf.modified.push(path);
            }
        });
    });
};

function Push(ref, headId, tailId, count) {
    this.ref = ref;
    this.headId = headId;
    this.head = null;
    this.tailId = tailId;
    this.tail = new Commit(tailId);
    this.count = count;
    this.commits = {};
    this.commits[tailId] = this.tail;
    this.lines = {
        added: 0,
        deleted: 0,
    };
    this.files = {
        added: [],
        deleted: [],
        renamed: [],
        modified: [],
    };
}

function Commit(id) {
    this.id = id;
    this.author = null;
    this.date = null;
    this.parents = null;
    this.lines = {
        added: 0,
        deleted: 0,
    };
    this.files = {
        added: [],
        deleted: [],
        renamed: [],
        modified: [],
    };
}
