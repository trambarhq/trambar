import _ from 'lodash';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';
import * as TagScanner from 'utils/tag-scanner';

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
    let issueRepo, issueLink;
    for (let repo of repos) {
        let link = ExternalDataUtils.findLinkByRelative(story, repo, 'project');
        if (link && link.issue) {
            issueRepo = repo;
            issueLink = link;
        }
    }
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

export {
    extractIssueDetails,
};
