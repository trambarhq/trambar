import _ from 'lodash';
import React, { useRef, useMemo } from 'react';
import { useListener } from 'relaks';
import * as TagScanner from 'common/utils/tag-scanner.js';
import * as RepoUtils from 'common/objects/utils/repo-utils.js';
import * as UserUtils from 'common/objects/utils/user-utils.js';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { TextField } from '../widgets/text-field.jsx';

// custom hooks
import {
  useDraftBuffer,
} from '../hooks.js';

import './issue-dialog-box.scss';

/**
 * Dialog box for adding a title and tags to a story being exported to an
 * issue tracker.
 */
function IssueDialogBox(props) {
  const { env, currentUser, issue, story, repos, allowDeletion } = props;
  const { onCancel, onConfirm } = props;
  const { t, p } = env.locale;
  const textFieldRef = useRef();
  const availableRepos = useMemo(() => {
    const accessible = _.filter(repos, (repo) => {
      return UserUtils.canAddIssue(currentUser, story, repo, 'read-write');
    });
    const sorted = _.sortBy(repos, (repo) => {
      return _.toLower(p(repo.details.title) || repo.name);
    });
    return sorted;
  }, [ env, currentUser, story, repos ]);
  const draft = useDraftBuffer({
    original: issue || {},
    prefill: generateNewIssue,
  });
  const selectedRepoID = draft.get('repo_id');
  const selectedRepo = _.find(availableRepos, { id: selectedRepoID });

  const handleDeleteClick = useListener((evt) => {
    if (onConfirm) {
      onConfirm({ issue: null });
    }
  });
  const handleCancelClick = useListener((evt) => {
    if (onCancel) {
      onCancel({});
    }
  });
  const handleOKClick = useListener((evt) => {
    // make sure the selected labels exist in the selected repo only
    const labels = _.intersection(draft.current.labels, selectedRepo.details.labels);
    const newIssue = { ...draft.current, labels };
    if (onConfirm) {
      onConfirm({ issue: newIssue });
    }
  });
  const handleTitleChange = useListener((evt) => {
    const text = evt.target.value;
    draft.set('title', text);
  });
  const handleRepoChange = useListener((evt) => {
    const repoID = parseInt(evt.target.value);
    draft.set('repo_id', repoID);
  });
  const handleTagClick = useListener((evt) => {
    const label = evt.target.getAttribute('data-label');
    const labelsBefore = draft.get('labels', []);
    const labels = _.toggle(labelsBefore, label);
    draft.set('labels', labels);
  });

  return (
    <div className="issue-dialog-box">
      {renderForm()}
      <div className="controls">
        {renderButtons()}
      </div>
    </div>
  );

  function renderForm() {
    return (
      <div className="container">
        <div className="top">
          {renderTitleInput()}
          {renderRepoSelector()}
        </div>
        {renderLabelSelector()}
      </div>
    );
  }

  function renderTitleInput() {
    const props = {
      id: 'title',
      value: draft.get('title', ''),
      env,
      onChange: handleTitleChange,
    };
    return <TextField ref={textFieldRef} {...props}>{t('issue-title')}</TextField>;
  }

  function renderRepoSelector() {
    if (availableRepos.length <= 1) {
      return null;
    }
    return (
      <div className="select-field">
        <label>{t('issue-repo')}</label>
        <select value={selectedRepo.id} onChange={handleRepoChange}>
          {_.map(repos, renderRepoOption)}
        </select>
      </div>
    );
  }

  function renderRepoOption(repo, i) {
    const title = RepoUtils.getDisplayName(repo, env);
    return <option key={i} value={repo.id}>{title}</option>;
  }

  function renderLabelSelector() {
    if (!selectedRepo) {
      return null;
    }
    const { labels } = selectedRepo.details;
    const tags = _.map(labels, renderLabel);
    for (let i = 1; i < tags.length; i += 2) {
      tags.splice(i, 0, ' ');
    }
    return <div className="tags">{tags}</div>;
  }

  function renderLabel(label, i) {
    const classNames = [ 'tag' ];
    const selectedLabels = draft.get('labels', []);
    if (_.includes(selectedLabels, label)) {
      classNames.push('selected');
    }
    const props = {
      className: classNames.join(' '),
      style: RepoUtils.getLabelStyle(selectedRepo, label),
      'data-label': label,
      onClick: handleTagClick,
    };
    return <span key={i} {...props}>{label}</span>;
  }

  function renderButtons() {
    const unsaved = { draft };
    const text = draft.get('title', '');
    const canDelete = false;
    const deleteProps = {
      label: t('issue-delete'),
      emphasized: false,
      hidden: !canDelete,
      onClick: handleDeleteClick,
    };
    const cancelProps = {
      label: t('issue-cancel'),
      emphasized: false,
      onClick: handleCancelClick,
    };
    const confirmProps = {
      label: t('issue-ok'),
      emphasized: true,
      disabled: !unsaved || !selectedRepo,
      onClick: handleOKClick,
    };
    return (
      <div className="buttons">
        <div className="left">
          <PushButton {...deleteProps} />
        </div>
        <div className="right">
          <PushButton {...cancelProps} />
          <PushButton {...confirmProps} />
        </div>
      </div>
    );
  }

  function generateNewIssue(base) {
    const { text } = story.details;
    const langText = p(text);
    // look for a title in the text
    const paragraphs = _.split(_.trim(langText), /[\r\n]+/);
    const first = TagScanner.removeTags(paragraphs[0]);
    // use first paragraph as title only if it isn't very long
    let title = '';
    if (first.length < 100) {
      title = first;
    }

    // look for tags that match labels
    const allLabels = _.uniq(_.flatten(_.map(repos, 'details.labels')));
    const labels = _.filter(allLabels, (label) => {
      let tag = `#${_.replace(label, /\s+/g, '-')}`;
      return _.includes(story.tags, tag);
    });

    // choose the last one selected
    const lastSelectedRepoID = parseInt(localStorage.last_selected_repo_id);
    let repo = _.find(availableRepos, { id: lastSelectedRepoID });
    if (!repo) {
      // find one with labels--if a repo has no labels, then its
      // issue tracker probably isn't being used
      const sorted = _.sortBy(availableRepos, (repo) => {
        return _.size(repo.details.labels);
      });
      repo = _.last(sorted);
    }

    return {
      title,
      labels,
      repo_id: (repo) ? repo.id : undefined,
    };
  }
}

const overlay = Overlay.create(IssueDialogBox);

export {
  overlay as IssueDialogBox,
};
