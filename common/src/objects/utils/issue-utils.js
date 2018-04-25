var _ = require('lodash');
var ExternalDataUtils = require('objects/utils/external-data-utils');
var TagScanner = require('utils/tag-scanner');

module.exports = {
    extractIssueDetails,
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
function extractIssueDetails(story, repos) {
    if (!story) {
        return null;
    }
    // find the repo in whose tracker the issue resides
    var issueRepo, issueLink;
    _.each(repos, (repo) => {
        var link = ExternalDataUtils.findLinkByRelative(story, repo, 'project');
        if (link && link.issue) {
            issueRepo = repo;
            issueLink = link;
        }
    });
    if (!issueRepo) {
        // either the repo has gone missing or it's not loaded yet
        return null;
    }
    return {
        id: issueLink.issue.id,
        number: issueLink.issue.number,
        title: story.details.title || '',
        labels: story.details.labels || [],
        repo_id: issueRepo.id,
    };
}
