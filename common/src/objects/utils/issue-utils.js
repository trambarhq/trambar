var _ = require('lodash');
var ExternalDataUtils = require('objects/utils/external-data-utils');
var TagScanner = require('utils/tag-scanner');

module.exports = {
    extract,
    attach,
};

/**
 * Extract information concerning an issue issue from a story and
 * arrange it in a more intuitive fashion
 *
 * @param  {Story} story
 * @param  {Array<Repo>} repos
 *
 * @return {Object|null}
 */
function extract(story, repos) {
    if (!story) {
        return null;
    }
    // find the repo in whose tracker the issue resides
    var repo = _.find(repos, (repo) => {
        var link = ExternalDataUtils.findLinkByRelative(story, repo, 'project');
        if (link && link.issue) {
            if (!link.issue.deleted) {
                return true;
            }
        }
    });
    if (!repo) {
        // either the repo has gone missing or it's not loaded yet
        return null;
    }
    return {
        title: story.details.title || '',
        labels: story.details.labels || [],
        repoId: repo.id
    };
}

/**
 * Attach issue details to a story
 *
 * @param  {Story} story
 * @param  {Object} issue
 * @param  {User} user
 * @param  {Array<Repo>} repos
 *
 * @return {Boolean}
 */
function attach(story, issue, user, repos) {
    try {
        if (issue) {
            // find the correct repo
            var repo = _.find(repos, { id: issue.repoId });
            // find the server that hosts the repo and that the user has access to
            var server = ExternalDataUtils.findCommonServer(repo, user);
            var userLink = ExternalDataUtils.findLink(user, server);
            // find existing issue link (when modifying existing story)
            var issueLink = ExternalDataUtils.findLinkByRelative(story, repo, 'project');
            if (!issueLink) {
                // an incomplete issue link--server will add the issue id and number
                // also add the user id, so we know who to post issue as
                issueLink = ExternalDataUtils.inheritLink(story, server, repo, {
                    issue: {
                        id: 0,
                        number: 0
                    },
                    user: { id: userLink.user.id }
                }, {
                    duplicate: 'ignore'
                });
            } else {
                // in case the issue is being modified by another user
                issueLink.user.id = userLink.user.id;
            }
            story.details.title = issue.title;
            story.details.labels = issue.labels;
            story.tags = _.union(story.tags, _.map(issue.labels, (label) => {
                return '#' + _.replace(label, /\s+/g, '-');
            }));

            // mark other links as deleted
            // this happens when we change the repo to which the issue belongs
            _.each(story.external, (link) => {
                if (link !== issueLink && link.issue) {
                    link.issue.deleted = true;
                }
            });
            return true;
        } else {
            // delete the issue
            _.remove(story.external, (link) => {
                if (link.issue) {
                    if (link.issue.id) {
                        // the issue has already been created
                        link.issue.deleted = true;
                        return false;
                    } else {
                        // the issue hasn't been created yet--simply remove it
                        return true;
                    }
                }
            });
            delete story.details.title;
            delete story.details.labels;
            story.tags = TagScanner.findTags(story.details.text);
            return false;
        }
    } catch (err) {
        console.error(err);
    }
}
