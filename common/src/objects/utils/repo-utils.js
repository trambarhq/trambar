import _ from 'lodash';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

function getDisplayName(repo, env) {
    let { p } = env.locale;
    let title;
    if (repo && repo.details) {
        title = p(repo.details.title) || repo.name;
    }
    return title || '';
}

function getURL(repo) {
    let url;
    if (repo && repo.details) {
        url = repo.details.web_url;
    }
    return url;
}

function getIssueNumber(repo, story) {
    let number;
    let issueLink = ExternalDataUtils.findLinkByRelations(story, 'issue');
    number = _.get(issueLink, 'issue.number');
    return number || '';
}

function getIssueURL(repo, story) {
    let url;
    let repoURL = getURL(repo);
    let issueNumber = getIssueNumber(repo, story);
    if (repoURL && issueNumber) {
        url = `${repoURL}/issues/${issueNumber}`;
    }
    return url;
}

function getMilestoneURL(repo, story) {
    let url;
    let repoURL = getURL(repo);
    let milestoneLink = ExternalDataUtils.findLinkByRelations(story, 'milestone');
    let milestoneID = _.get(milestoneLink, 'milestone.id');
    if (repoURL && milestoneID) {
        url = `${repo.details.web_url}/milestones/${milestoneID}`;
    }
    return url;
}

function getMergeRequestURL(repo, story) {
    let url;
    let repoURL = getURL(repo);
    let mergeRequestLink = ExternalDataUtils.findLinkByRelations(story, 'merge_request');
    let mergeRequestID = _.get(mergeRequestLink, 'merge_request.number');
    if (repoURL && mergeRequestID) {
        url = `${repo.details.web_url}/merge_requests/${milestoneID}`;
    }
    return url;
}

function getPushURL(repo, story) {
    let url;
    let commitBefore = _.get(story, 'details.commit_before');
    let commitAfter = _.get(story, 'details.commit_after');
    let repoURL = getURL(repo);
    if (repoURL) {
        if (commitBefore) {
            url = `${repoURL}/compare/${commitBefore}...${commitAfter}`;
        } else if (commitAfter) {
            url = `${repoURL}/commit/${commitAfter}`;
        }
    }
    return url;
}

function getBranchURL(repo, story) {
    let url;
    let branch = _.get(story, 'details.branch');
    let repoURL = getURL(repo);
    if (repoURL) {
        if (story.type === 'branch') {
            url = `${repoURL}/commits/${branch}`;
        } else if (story.type === 'tag') {
            url = `${repoURL}/tags/${branch}`;
        }
    }
    return url;
}

function getLabelStyle(repo, label) {
    let style;
    let labels = _.get(repo, 'details.labels');
    let colors = _.get(repo, 'details.label_colors');
    let index = _.indexOf(repo.details.labels, label);
    let backgroundColor = _.get(colors, index);
    if (backgroundColor) {
        style = { backgroundColor };
        if (isBright(backgroundColor)) {
            style.color = '#000000';
        }
    }
    return style;
}

function getNoteHash(noteLink) {
    let noteID = _.get(noteLink, 'note.id');
    return (noteID) ? `#note_${noteID}` : '';
}

function getCommitNoteURL(repo, reaction) {
    let url;
    let repoURL = getURL(repo);
    let noteLink = ExternalDataUtils.findLinkByRelations(reaction, 'note', 'commit');
    if (repoURL && noteLink) {
        let commitID = noteLink.commit.id;
        let hash = getNoteHash(noteLink);
        url = `${repoURL}/commit/${commitID}${hash}`;
    }
    return url;
}

function getIssueNoteURL(repo, reaction) {
    let url;
    let repoURL = getURL(repo);
    let noteLink = ExternalDataUtils.findLinkByRelations(reaction, 'note', 'issue');
    let issueNumber = _.get(noteLink, 'issue.number');
    if (repoURL && issueNumber) {
        let hash = getNoteHash(noteLink);
        url = `${repoURL}/issues/${issueNumber}${hash}`;
    }
    return url;
}

function getMergeRequestNoteURL(repo, reaction) {
    let url;
    let repoURL = getURL(repo);
    let noteLink = ExternalDataUtils.findLinkByRelations(reaction, 'note', 'merge_request');
    let mergeRequestNumber = _.get(noteLink, 'merge_request.number');
    if (repoURL && mergeRequestNumber) {
        let hash = getNoteHash(noteLink);
        url = `${repoURL}/merge_requests/${mergeRequestNumber}${hash}`;
    }
    return url;
}

function isBright(color) {
    var r, g, b;
    if (color.length === 4) {
        r = parseInt(color.substr(1, 1), 16) * (1 / 15);
        g = parseInt(color.substr(2, 1), 16) * (1 / 15);
        b = parseInt(color.substr(3, 1), 16) * (1 / 15);
    } else if (color.length === 7) {
        r = parseInt(color.substr(1, 2), 16) * (1 / 255);
        g = parseInt(color.substr(3, 2), 16) * (1 / 255);
        b = parseInt(color.substr(5, 2), 16) * (1 / 255);
    }
    var b = Math.sqrt(0.299 * r*r + 0.587 * g*g + 0.114 * b*b);
    return (b > 0.80);
}

export {
    getDisplayName,
    getURL,
    getIssueNumber,
    getIssueURL,
    getMilestoneURL,
    getMergeRequestURL,
    getPushURL,
    getBranchURL,
    getLabelStyle,
};
