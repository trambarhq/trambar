var _ = require('lodash');
var ExternalDataUtils = require('objects/utils/external-data-utils');

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
        return ExternalDataUtils.findLinkByRelative(story, repo, 'project');
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
                });
            } else {
                // in case the issue is being modified by another user
                issueLink.user.id = userLink.user.id;
            }
            story.details.title = issue.title;
            story.details.labels = issue.labels;
            story.tags = _.union(story.tags, _.map(issue.labels, (label) => {
                return _.replace(label, /\s+/g, '-');
            }));

            // remove other links
            _.remove(story.external, (link) => {
                return (link !== issueLink && link.issue);
            });
            return true;
        } else {
            // remove any issue link
            delete story.external;
            delete story.details.title;
            delete story.details.labels;
            return false;
        }
    } catch (err) {
        console.error(err);
    }
}
