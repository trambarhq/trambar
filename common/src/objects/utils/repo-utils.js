import { findLinkByRelations } from './external-data-utils.js';

function getRepoName(repo, env) {
  const { p } = env.locale;
  return p(repo?.details?.title) || repo?.name || '';
}

function getRepoURL(repo) {
  return repo?.details?.web_url || '';
}

function getRepoIconClass(repo) {
  switch (repo?.type) {
    case 'gitlab':
      return 'fab fa-gitlab';
    default:
      return '';
  }
}

function getTemplateName(repo, env) {
  return repo?.details?.template_name || getRepoName(repo, env);
}

function getTemplateVersion(repo) {
  return repo?.details?.template_version || '';
}

function getTemplateDescription(repo, env) {
  return repo?.details?.template_description || '';
}

function getMembershipPageURL(repo) {
  let projectURL = getRepoURL(repo)
  if (projectURL) {
    projectURL = projectURL.replace(/[\/\s]+$/, '');
    return `${projectURL}/settings/members`;
  }
}

function getIssueNumber(repo, story) {
  const issueLink = findLinkByRelations(story, 'issue');
  return issueLink?.issue?.number || '';
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
  const milestoneID = milestoneLink?.milestone?.id;
  if (repoURL && milestoneID) {
    return `${repo.details.web_url}/milestones/${milestoneID}`;
  }
}

function getMergeRequestURL(repo, story) {
  const repoURL = getRepoURL(repo);
  const mergeRequestLink = findLinkByRelations(story, 'merge_request');
  const mergeRequestID = mergeRequestLink?.merge_request?.number;
  if (repoURL && mergeRequestID) {
    return `${repo.details.web_url}/merge_requests/${mergeRequestID}`;
  }
}

function getPushURL(repo, story) {
  const commitBefore = story?.details?.commit_before;
  const commitAfter = story?.details?.commit_after;
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
  const branch = story?.details?.branch;
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
  const labels = repo?.details?.labels;
  const index = repo?.details?.labels?.indexOf(label);
  const backgroundColor = repo?.details?.label_colors?.[index];
  if (backgroundColor) {
    const style = { backgroundColor };
    if (isBright(backgroundColor)) {
      style.color = '#000000';
    }
    return style;
  }
}

function getNoteHash(noteLink) {
  const noteID = noteLink?.note?.id;
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
      if (commitIDs?.length === 1) {
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
  const issueNumber = noteLink?.issue?.number;
  if (repoURL && issueNumber) {
    const hash = getNoteHash(noteLink);
    return `${repoURL}/issues/${issueNumber}${hash}`;
  }
}

function getMergeRequestNoteURL(repo, reaction) {
  const repoURL = getRepoURL(repo);
  const noteLink = findLinkByRelations(reaction, 'note', 'merge_request');
  const mergeRequestNumber = noteLink?.merge_request?.number;
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
  getRepoIconClass,
  getTemplateName,
  getTemplateVersion,
  getTemplateDescription,
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
