import React, { useState, useMemo, useRef } from 'react';
import { useListener, useSaveBuffer, useErrorCatcher } from 'relaks';
import round from 'lodash/round.js';
import { renderPlainText, findEmoji, capitalize } from 'common/utils/plain-text.js';
import { renderMarkdown } from 'common/utils/markdown.js';
import { getWebsiteAddress } from 'common/objects/utils/project-utils.js';
import { updateTaskStatuses, saveSurveyResults } from 'common/objects/savers/reaction-saver.js';
import { getRepoName, getRepoURL, getMembershipPageURL, getIssueNumber, getIssueURL, getMilestoneURL,
  getMergeRequestURL, getPushURL, getBranchURL, getIssueLabelStyle } from 'common/objects/utils/repo-utils.js';
import { saveStory } from 'common/objects/savers/story-saver.js';
import { extractUserAnswers, insertUserAnswers } from 'common/objects/utils/story-utils.js';
import { getUserName, getGender, canAccessRepo } from 'common/objects/utils/user-utils.js';
import { orderBy } from 'common/utils/array-utils.js';

// widgets
import { MediaView } from '../views/media-view.jsx';
import { MediaDialogBox } from '../dialogs/media-dialog-box.jsx';
import { AppComponent } from '../views/app-component.jsx';
import { AppComponentDialogBox } from '../dialogs/app-component-dialog-box.jsx';
import { Scrollable } from '../widgets/scrollable.jsx';
import { PushButton } from '../widgets/push-button.jsx';

// custom hooks
import { useMarkdownResources, useDraftBuffer } from '../hooks.js';

import './story-contents.scss';

/**
 * Component that renders a story's contents. Used by StoryView.
 */
export function StoryContents(props) {
  const { story, authors, reactions, repo, project, currentUser } = props;
  const { database, env, access } = props;
  const { t, p, g, f } = env.locale;
  const audioPlayerRef = useRef();
  const [ selectedComponent, setSelectedComponent ] = useState();
  const [ error, run ] = useErrorCatcher();
  const originalAnswers = useMemo(() => {
    return extractUserAnswers(story, env.locale);
  }, [ story, env.locale ]);
  const userAnswers = useDraftBuffer({
    original: originalAnswers,
  });
  const resources = story.details.resources;
  const markdownRes = useMarkdownResources(resources, env);
  if (error) {
    console.error(error);
  }

  const handleTaskListItemChange = useListener((evt) => {
    run(async () => {
      const target = evt.currentTarget;
      const { name, value, checked } = target;
      userAnswers.set([ name, value ], checked);

      const storyUpdated = insertUserAnswers(story, userAnswers.current);
      const storyAfter = await saveStory(database, storyUpdated);
      await updateTaskStatuses(database, reactions, storyAfter, currentUser, userAnswers.current);
    });
  });
  const handleSurveyItemChange = useListener((evt) => {
    const target = evt.currentTarget;
    const { name, value, checked } = target;
    userAnswers.set(name, value);
  });
  const handleVoteSubmitClick = useListener((evt) => {
    run(async () => {
      await saveSurveyResults(database, story, currentUser, userAnswers.current);
    });
  });
  const handleComponentSelect = useListener((evt) => {
    setSelectedComponent(evt.component);
  });
  const handleComponentDialogClose = useListener((evt) => {
    setSelectedComponent(null);
  });

  const authorName = getUserName(authors ? authors[0] : null, env);
  const authorGender = getGender(authors ? authors[0] : null);
  g(authorName, authorGender);
  const repoName = getRepoName(repo, env);
  const repoAccess = canAccessRepo(currentUser, repo);

  const userCanVote = (story.type === 'survey') && (access === 'read-write');
  const userVoted = (reactions) ? getUserVote(reactions, currentUser) : undefined;

  return (
    <div className="story-contents">
      {renderText()}
      {renderAudioPlayer()}
      {renderMedia()}
      {renderReferencedMediaDialog()}
      {renderAppComponents()}
      {renderButtons()}
    </div>
  );

  function renderText() {
    const { exported } = story.details;
    switch (story.type) {
      case 'post':
      case 'task-list':
      case 'survey':
        return renderStoryText();
      case 'repo':
        return renderRepoText();
      case 'member':
        return renderMemberText();
      case 'push':
      case 'merge':
        return renderPushText();
      case 'branch':
      case 'tag':
        return renderBranchText();
      case 'snapshot':
        return renderSnapshotText();
      case 'issue':
        if (exported) {
          return renderStoryText();
        } else {
          return renderIssueText();
        }
      case 'merge-request':
        return renderMergeRequestText();
      case 'milestone':
        return renderMilestoneText();
      case 'wiki':
        return renderWikiText();
      case 'website-traffic':
        return renderWebsiteTrafficText();
    }
  }

  function renderStoryText() {
    const { type } = story;
    const { text, markdown, labels } = story.details;
    const langText = p(text).trimEnd();
    const textProps = {
      type,
      text: langText,
      markdown,
      answers: userAnswers.current,
      onReference: markdownRes.onReference,
    };
    const classNames = [ 'text', type, (markdown) ? 'markdown' : 'plain-text' ];
    if (type === 'post') {
      // if all we have are emojis, make them bigger depending on
      // how many there are
      const emoji = findEmoji(langText);
      const chars = langText.replace(/\s+/g, '');
      if (emoji && emoji.join('') === chars) {
        classNames.push(`emoji-${emoji.length}`);
      }
    } else if (type === 'task-list') {
      if (story.user_ids.includes(currentUser.id)) {
        textProps.onChange = handleTaskListItemChange;
      }
    } else if (type === 'survey') {
      if (userVoted || !userCanVote) {
        textProps.results = countVotes(reactions);
      } else {
        textProps.onChange = handleSurveyItemChange;
      }
    }
    return (
      <div className={classNames.join(' ')} onClick={markdownRes.onClick}>
        {markdown ? renderMarkdown(textProps) : renderPlainText(textProps)}
        {renderLabels()}
      </div>
    );
  }

  function renderRepoText() {
    const { action } = story.details;
    const url = (repoAccess) ? getRepoURL(repo) : undefined;
    const target = (repoAccess) ? repo.type : undefined;
    return (
      <div className="text repo">
        <p>
          <a href={url} target={target}>
            {t(`story-$name-${action}-$repo`, authorName, repoName)}
          </a>
        </p>
      </div>
    );
  }

  function renderMemberText() {
    const { action } = story.details;
    const url = (repoAccess) ? getMembershipPageURL(repo) : undefined
    const target = (repoAccess) ? repo.type : undefined;
    return (
      <div className="text member">
        <p>
          <a href={url} target={target}>
            {t(`story-$name-${action}-$repo`, authorName, repoName)}
          </a>
        </p>
      </div>
    );
  }

  function renderIssueText() {
    const { title } = story.details;
    const number = getIssueNumber(repo, story);
    const url = (repoAccess) ? getIssueURL(repo, story) : undefined;
    const target = (repoAccess) ? repo.type : undefined;
    return (
      <div className="text issue">
        <p>
          <a href={url} target={target}>
            {t(`story-$name-opened-issue-$number-$title`, authorName, number, p(title))}
          </a>
        </p>
        {renderStatus()}
        {renderLabels()}
      </div>
    );
  }

  function renderMilestoneText() {
    const { title } = story.details;
    const url = (repoAccess) ? getMilestoneURL(repo, story) : undefined;
    const target = (repoAccess) ? repo.type : undefined;
    return (
      <div className="text milestone">
        <p>
          <a href={url} target={target}>
            {t(`story-$name-created-$milestone`, authorName, p(title))}
          </a>
        </p>
      </div>
    );
  }

  function renderMergeRequestText() {
    const {
      source_branch: branch1,
      branch: branch2
    } = story.details;
    const url = (repoAccess) ? getMergeRequestURL(repo, story) : undefined;
    const target = (repoAccess) ? repo.type : undefined;
    return (
      <div className="text merge-request">
        <p>
          <a href={url} target={target}>
            {t(`story-$name-requested-merge-$branch1-into-$branch2`, authorName, branch1, branch2)}
          </a>
        </p>
        {renderStatus()}
        {renderLabels()}
      </div>
    );
  }

  function renderWikiText() {
    const { action, title, url: wikiURL } = story.details;
    const deleted = (action === 'delete');
    const url = (repoAccess && !deleted) ? wikiURL : undefined;
    const target = (repoAccess && !deleted) ? repo.type : undefined;
    return (
      <div className="text wiki">
        <p>
          <a href={url} target={target}>
            {t(`story-$name-${action}d-$page`, authorName, capitalize(title))}
          </a>
        </p>
      </div>
    );
  }

  function renderPushText() {
    const {
      branch,
      from_branches: sourceBranches
    } = story.details;
    const url = (repoAccess) ? getPushURL(repo, story) : undefined;
    const target = (repoAccess) ? repo.type : undefined;
    let text;
    if (story.type === 'push') {
      text = t(`story-$name-pushed-to-$branch-of-$repo`, authorName, branch, repoName);
    } else if (story.type === 'merge') {
      text = t(`story-$name-merged-$branches-into-$branch-of-$repo`, authorName, sourceBranches, branch, repoName);
    }
    return (
      <div className="text push">
        <p>
          <a href={url} target={target}>{text}</a>
        </p>
        {renderChanges()}
      </div>
    );
  }

  function renderBranchText() {
    const { branch } = story.details;
    const url = (repoAccess) ? getBranchURL(repo, story) : undefined;
    const target = (repoAccess) ? repo.type : undefined;
    let text;
    if (story.type === 'branch') {
      text = t(`story-$name-created-$branch-in-$repo`, name, branch, repoName);
    } else if (story.type === 'tag') {
      text = t(`story-$name-created-$tag-in-$repo`, name, branch, repoName);
    }
    return (
      <div className="text push">
        <p>
          <a href={url} target={target}>{text}</a>
        </p>
        {renderChanges()}
      </div>
    );
  }

  function renderSnapshotText() {
    const {
      branch,
      commit_after: commitID,
    } = story.details;
    let url = getWebsiteAddress(project)
    let text;
    if (branch === 'master') {
      text = t(`story-$name-changed-production-website`, authorName);
    } else {
      text = t(`story-$name-created-website-version-in-$branch`, authorName, branch);
      if (url) {
        url += `(${commitID})/`;
      }
    }
    return (
      <div className="text push">
        <p>
          <a href={url} target="_blank">{text}</a>
        </p>
      </div>
    );
  }

  function renderWebsiteTrafficText() {
    const total = story.details.total;
    const date = f(story.details.date);
    return (
      <div className="text website-traffic">
        <p>
          {t('story-website-traffic-$count-on-$date', total, date)}
        </p>
        <p>{renderWebsiteTrafficChart()}</p>
      </div>
    );
  }

  function renderWebsiteTrafficChart() {
    const total = story.details.total;
    const byCountry = story.details.by_country;
    const countries = [];
    for (let [ code, count ] of Object.entries(byCountry)) {
      countries.push({ code, count });
    }
    const topCountries = orderBy(countries, 'count', 'desc');
    if (topCountries.length > 5) {
      const otherCountries = topCountries.splice(4);
      const otherTotal = otherCountries.reduce((sum, c) => sum + c.count, 0);
      const otherCodes = otherCountries.map(c => c.code);
      topCountries.push({ code: 'zz', count: otherTotal, others: otherCodes });
    }
    return topCountries.map((country, key) => {
      const classNames = [ 'by-country' ];
      const percentNum = round(country.count / total * 100);
      if (percentNum === 0) {
        return;
      } else if (percentNum >= 99) {
        classNames.push('vast-majority');
      }
      const percent = percentNum + '%';
      const color = `color-${key + 1}`;
      let title;
      if (country.code === 'zz') {
        const others = country.others.map((code) => {
          return t(`country-name-${code}`);
        });
        title = others.join(', ');
      }
      return (
        <span className={classNames.join(' ')} title={title} key={key}>
          <span className="label">{t(`country-name-${country.code}`)}</span>
          <span className="bar">
            <span className={`filled ${color}`} style={{ width: percent }} />
            <span className="percent">{percent}</span>
            <span className="count">{country.count}</span>
          </span>
        </span>
      );
    });
  }

  function renderChanges() {
    const files = story.details.files;
    if (files.length === 0) {
      return null;
    }
    const fileChangeTypes = [ 'added', 'deleted', 'modified', 'renamed' ];
    const fileChanges = [];
    for (let [ index, type ] of fileChangeTypes.entries()) {
      const count = files[type];
      if (count > 0) {
        fileChanges.push(
          <li key={index} className={type}>
            {t(`story-push-${type}-$count-files`, count)}
          </li>
        );
      }
    }
    const lines = story.details.lines;
    const lineChangeTypes = [ 'added', 'deleted', 'modified' ];
    const lineChanges = []
    for (let [ index, type ] of lineChangeTypes) {
      const count = lines[type];
      if (count > 0) {
        lineChanges.push(
          <li key={i} className={type}>
            {t(`story-push-${type}-$count-lines`, count)}
          </li>
        );
      }
    }
    return (
      <div>
        <ul className="files">{fileChanges}</ul>
        <ul className="lines">{lineChanges}</ul>
      </div>
    );
  }

  function renderStatus() {
    const { state } = story.details;
    if (!state) {
      return null;
    }
    return (
      <p className={`status-${state}`}>
        <span>{t('story-issue-current-status')}</span>
        {' '}
        <span>{t(`story-issue-status-${state}`)}</span>
      </p>
    );
  }

  function renderLabels() {
    const { labels } = story.details;
    if (labels.length === 0) {
      return null;
    }
    const tags = labels.map(renderLabel);
    // inserting actual spaces between the tags for the sake of copy-and-pasting
    for (let i = 1; i < tags.length; i += 2) {
      tags.splice(i, 0, ' ');
    }
    return <p className="tags">{tags}</p>;
  }

  function renderLabel(label, i) {
    const style = getIssueLabelStyle(repo, label);
    return <span key={i} className="tag" style={style}>{label}</span>;
  }

  function renderButtons() {
    if (!userCanVote || userVoted) {
      return null;
    }
    const allAnswered = Object.values(userAnswers.current).every(Boolean);
    const submitProps = {
      label: t('story-vote-submit'),
      emphasized: allAnswered,
      disabled: !allAnswered,
      onClick: handleVoteSubmitClick,
    };
    return (
      <div className="buttons">
        <PushButton {...submitProps} />
      </div>
    );
  }

  function renderAudioPlayer() {
    const { audioURL, onAudioEnded } = markdownRes;
    if (!audioURL) {
      return null;
    }
    const audioProps = {
      src: audioURL,
      autoPlay: true,
      controls: true,
      onEnded: onAudioEnded,
    };
    return <audio ref={audioPlayerRef} {...audioProps} />;
  }

  function renderMedia() {
    const remaining = markdownRes.unreferenced;
    if (remaining.length === 0) {
      return null;
    }
    const props = {
      resources: remaining,
      width: Math.min(512, env.viewportWidth),
      env,
    };
    return <MediaView {...props} />
  }

  function renderReferencedMediaDialog() {
    const { zoomed, referencedZoomable, selected, onClose } = markdownRes;
    const selectedIndex = referencedZoomable.indexOf(selected);
    const dialogProps = {
      show: zoomed && (selectedIndex !== -1),
      resources: referencedZoomable,
      selectedIndex,
      env,
      onClose,
    };
    return <MediaDialogBox {...dialogProps} />;
  }

  function renderAppComponents() {
    const components = story.details.components;
    if (components.length === 0) {
      return null;
    }
    const sorted = sortComponents(components, env);
    return (
      <div className="impact">
        <p className="message">{t('story-push-components-changed')}</p>
        <Scrollable>
          {sorted.map(renderAppComponent)}
        </Scrollable>
        {renderAppComponentDialog()}
      </div>
    );
  }

  function renderAppComponent(component, i) {
    const componentProps = {
      component,
      env,
      onSelect: handleComponentSelect,
    };
    return <AppComponent key={i} {...componentProps} />
  }

  function renderAppComponentDialog() {
    let dialogProps = {
      show: !!selectedComponent,
      component: selectedComponent,
      env,
      onClose: handleComponentDialogClose,
    };
    return <AppComponentDialogBox {...dialogProps} />;
  }
}

function countVotes(reactions) {
  let tallies = {};
  if (reactions) {
    for (let reaction of reactions) {
      if (reaction.type === 'vote') {
        const { answers } = reaction.details;
        if (answers) {
          for (let [ name, value ] of Object.entries(answers)) {
            let tally = tallies[name];
            if (!tally) {
              tally = tallies[name] = {
                total: 0,
                answers: {}
              };
            }
            tally.total = tally.total + 1;
            tally.answers[value] = (tally.answers[value] || 0) + 1;
          }
        }
      }
    }
  }
  return tallies;
}

function getUserVote(reactions, user) {
  if (user) {
    return reactions.find(r => r.type === 'vote' && r.user_id === user.id);
  }
}

function sortComponents(components, env) {
  let { p } = env.locale;
  const text = c => p(c.text).toLowerCase();
  return orderBy(components, text, 'asc');
}
