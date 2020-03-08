import _ from 'lodash';
import { findLinkByRelations } from './external-data-utils.js';

function getRepoName(repo, env) {
  const { p } = env.locale;
  return p(_.get(repo, 'details.title')) || _.get(repo, 'name') || '';
}

function getRepoURL(repo) {
  return _.get(repo, 'details.web_url', '');
}

function getMembershipPageURL(repo) {
  let projectURL = getRepoURL(repo)
  if (projectURL) {
    projectURL = _.trimEnd(projectURL, ' /');
    return `${projectURL}/settings/members`;
  }
}

function getIssueNumber(repo, story) {
  const issueLink = findLinkByRelations(story, 'issue');
  const number = _.get(issueLink, 'issue.number');
  return number || '';
}

function getIssueURL(repo, story) {
  const repoURL = getRepoURL(repo);
  const issueNumber = getIssueNumber(repo, story);
  if (repoURL && issueNumber) {
    return `${repoURL}/issues/${issueNumber}`;
  }
}

function getMilestoneURL(repo, story) {
  const repoURL = getRepoURL(repo);
  const milestoneLink = findLinkByRelations(story, 'milestone');
  const milestoneID = _.get(milestoneLink, 'milestone.id');
  if (repoURL && milestoneID) {
    return `${repo.details.web_url}/milestones/${milestoneID}`;
  }
}

function getMergeRequestURL(repo, story) {
  const repoURL = getRepoURL(repo);
  const mergeRequestLink = findLinkByRelations(story, 'merge_request');
  const mergeRequestID = _.get(mergeRequestLink, 'merge_request.number');
  if (repoURL && mergeRequestID) {
    return `${repo.details.web_url}/merge_requests/${mergeRequestID}`;
  }
}

function getPushURL(repo, story) {
  const commitBefore = _.get(story, 'details.commit_before');
  const commitAfter = _.get(story, 'details.commit_after');
  const repoURL = getRepoURL(repo);
  if (repoURL) {
    if (commitBefore) {
      return `${repoURL}/compare/${commitBefore}...${commitAfter}`;
    } else if (commitAfter) {
      return `${repoURL}/commit/${commitAfter}`;
    }
  }
}

function getBranchURL(repo, story) {
  const branch = _.get(story, 'details.branch');
  const repoURL = getRepoURL(repo);
  if (repoURL) {
    if (story.type === 'branch') {
      return `${repoURL}/commits/${branch}`;
    } else if (story.type === 'tag') {
      return `${repoURL}/tags/${branch}`;
    }
  }
}

function getIssueLabelStyle(repo, label) {
  if (repo) {
    const labels = _.get(repo, 'details.labels');
    const colors = _.get(repo, 'details.label_colors');
    const index = _.indexOf(repo.details.labels, label);
    const backgroundColor = _.get(colors, index);
    if (backgroundColor) {
      const style = { backgroundColor };
      if (isBright(backgroundColor)) {
        style.color = '#000000';
      }
      return style;
    }
  }
}

function getNoteHash(noteLink) {
  const noteID = _.get(noteLink, 'note.id');
  return (noteID) ? `#note_${noteID}` : '';
}

function getCommitNoteURL(repo, reaction) {
  const repoURL = getRepoURL(repo);
  const noteLink = findLinkByRelations(reaction, 'note', 'commit');
  if (repoURL && noteLink) {
    let commitID = noteLink.commit.id;
    if (!commitID) {
      // deal with old buggy data
      const commitIDs = noteLink.commit.ids;
      if (_.size(commitIDs) === 1) {
        commitID = commitIDs[0];
      }
    }
    if (commitID) {
      const hash = getNoteHash(noteLink);
      return `${repoURL}/commit/${commitID}${hash}`;
    }
  }
}

function getIssueNoteURL(repo, reaction) {
  const repoURL = getRepoURL(repo);
  const noteLink = findLinkByRelations(reaction, 'note', 'issue');
  const issueNumber = _.get(noteLink, 'issue.number');
  if (repoURL && issueNumber) {
    const hash = getNoteHash(noteLink);
    return `${repoURL}/issues/${issueNumber}${hash}`;
  }
}

function getMergeRequestNoteURL(repo, reaction) {
  const repoURL = getRepoURL(repo);
  const noteLink = findLinkByRelations(reaction, 'note', 'merge_request');
  const mergeRequestNumber = _.get(noteLink, 'merge_request.number');
  if (repoURL && mergeRequestNumber) {
    const hash = getNoteHash(noteLink);
    return `${repoURL}/merge_requests/${mergeRequestNumber}${hash}`;
  }
}

function isBright(color) {
  let r, g, b;
  if (color.length === 4) {
    r = parseInt(color.substr(1, 1), 16) * (1 / 15);
    g = parseInt(color.substr(2, 1), 16) * (1 / 15);
    b = parseInt(color.substr(3, 1), 16) * (1 / 15);
  } else if (color.length === 7) {
    r = parseInt(color.substr(1, 2), 16) * (1 / 255);
    g = parseInt(color.substr(3, 2), 16) * (1 / 255);
    b = parseInt(color.substr(5, 2), 16) * (1 / 255);
  }
  const brightness = Math.sqrt(0.299 * r*r + 0.587 * g*g + 0.114 * b*b);
  return (brightness > 0.80);
}

export {
  getRepoName,
  getRepoURL,
  getMembershipPageURL,
  getIssueNumber,
  getIssueURL,
  getMilestoneURL,
  getMergeRequestURL,
  getPushURL,
  getBranchURL,
  getIssueLabelStyle,
  getCommitNoteURL,
  getIssueNoteURL,
  getMergeRequestNoteURL,
};
