import _ from 'lodash';
import Moment from 'moment';
import React, { useState, useRef, useEffect } from 'react';
import { useProgress, useListener } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.js';
import { findServerTasks } from 'common/objects/finders/task-finder.js';

// widgets
import { SmartList } from 'common/widgets/smart-list.jsx';

import './task-list.scss';

/**
 * A list of server tasks that were performed previously or are currently in
 * progress. This is the asynchronous part that retrieves the necessary data.
 */
export async function TaskList(props) {
  const { database, env, server, scrollToTaskID } = props;
  const { t } = env.locale;
  const [ show ] = useProgress();
  const [ expandedTaskIDs, setExpandedTaskIDs ] = useState((scrollToTaskID) ? [ scrollToTaskID ] : []);
  const container = useRef();

  const handleTaskIdentity = useListener((evt) => {
    return `task-${evt.item.id}`;
  });
  const handleTaskRender = useListener((evt) => {
    if (evt.needed) {
      return renderTask(evt.item);
    } else {
      return <div className="task" />;
    }
  });
  const handleTaskClick = useListener((evt) => {
    let taskID = parseInt(evt.currentTarget.getAttribute('data-task-id'));
    const list = _.toggle(expandedTaskIDs, taskID);
    setExpandedTaskIDs(list);
  });

  useEffect(() => {
    if (scrollToTaskID) {
      container.current.scrollIntoView();
    }
  }, [])

  render();
  const currentUserID = await database.start();
  const tasks = await findServerTasks(database, server);
  render();

  function render() {
    const smartListProps = {
      items: sortTasks(tasks),
      offset: 5,
      behind: 20,
      ahead: 20,
      anchor: (scrollToTaskID) ? `task-${scrollToTaskID}` : undefined,

      onIdentity: handleTaskIdentity,
      onRender: handleTaskRender,
    };
    show(
      <div className="task-list" ref={container}>
        <SmartList {...smartListProps} />
      </div>
    , 'initial');
  }

  function renderTask(task) {
    const classNames = [ 'task' ];
    if (task.failed) {
      classNames.push('failure');
    }
    if (_.includes(expandedTaskIDs, task.id)) {
      classNames.push('expanded');
    }
    return (
      <div className={classNames.join(' ')}>
        <div className="summary" data-task-id={task.id} onClick={handleTaskClick}>
          {renderStartTime(task)}
          {renderMessage(task)}
          {renderProgress(task)}
        </div>
        {renderDetails(task)}
      </div>
    );
  }

  function renderStartTime(task) {
    const time = Moment(task.ctime).format('YYYY-MM-DD HH:mm:ss');
    return <div className="start-time">{time}</div>;
  }

  /**
   * Render a brief description of the task
   *
   * @param  {Task} task
   *
   * @return {ReactElement}
   */
  function renderMessage(task) {
    let message = getMessage(task);
    let badge;
    if (!message) {
      message = task.action + ' (noop)';
    }
    if (task.failed) {
      badge = <i className="fas fa-exclamation-triangle" />;
    }
    return <div className="message">{message}{badge}</div>;
  }

  function renderProgress(task) {
    if (task.completion === 100 && task.etime) {
      const duration = Moment(task.etime) - Moment(task.ctime);
      const seconds = Math.ceil(duration / 1000);
      return <div className="duration">{t('task-$seconds', seconds)}</div>;
    } else {
      const percent = task.completion + '%';
      return (
        <div className="progress-bar-frame">
          <div className="bar" style={{ width: percent }} />
        </div>
      );
    }
  }

  function renderDetails(task) {
    if (!_.includes(expandedTaskIDs, task.id)) {
      return null;
    }
    const message = getDetails(task);
    return (
      <div>
        <div className="details">{message}</div>
        {renderError(task)}
      </div>
    );
  }

  function renderError(task) {
    if (!task.failed) {
      return null;
    }
    const error = task.details?.error;
    const msg = error?.stack || error?.message;
    return <div className="error">{msg}</div>;
  }

  function getMessage(task) {
    if (task.completion === 100) {
      const repo = task.options.repo;
      const branch = task.options.branch;
      const added = _.size(task.details.added);
      const deleted = _.size(task.details.deleted);
      const modified = _.size(task.details.modified);
      switch (task.action) {
        case 'gitlab-repo-import':
          if (added) {
            return t('task-imported-$count-repos', added);
          } else if (deleted) {
            return t('task-removed-$count-repos', deleted);
          } else if (modified) {
            return t('task-updated-$count-repos', modified);
          }
          break;
        case 'gitlab-user-import':
          if (added) {
            return t('task-imported-$count-users', added);
          } else if (deleted) {
            return t('task-removed-$count-users', deleted);
          } else if (modified) {
            return t('task-updated-$count-users', modified);
          }
          break;
        case 'gitlab-wiki-import':
          if (added) {
            return t('task-imported-$count-wikis', added);
          } else if (deleted) {
            return t('task-removed-$count-wikis', deleted);
          } else if (modified) {
            return t('task-updated-$count-wikis', modified);
          }
          break;
        case 'gitlab-hook-install':
          return t('task-installed-$count-hooks', added);
        case 'gitlab-hook-remove':
          return t('task-removed-$count-hooks', deleted);
        case 'gitlab-event-import':
          return t('task-imported-$count-events-from-$repo', added, repo);
        case 'gitlab-push-import':
          return t('task-imported-push-with-$count-commits-from-$repo-$branch', added, repo, branch);
        case 'gitlab-commit-comment-import':
          return t('task-imported-$count-commit-comments-from-$repo', added, repo);
        case 'gitlab-issue-comment-import':
          return t('task-imported-$count-issue-comments-from-$repo', added, repo);
        case 'gitlab-merge-request-comment-import':
          return t('task-imported-$count-merge-request-comments-from-$repo', added, repo);
      }
    } else {
      const repo = task.options.repo;
      switch (task.action) {
        case 'gitlab-repo-import':
          return t('task-importing-repos');
        case 'gitlab-user-import':
          return t('task-importing-users');
        case 'gitlab-wiki-import':
          return t('task-importing-wikis');
        case 'gitlab-hook-install':
          return t('task-installing-hooks');
        case 'gitlab-hook-remove':
          return t('task-removing-hooks');
        case 'gitlab-event-import':
          return t('task-importing-events-from-$repo', repo);
        case 'gitlab-push-import':
          return t('task-importing-push-from-$repo', repo);
        case 'gitlab-commit-comment-import':
          return t('task-importing-commit-comments-from-$repo', repo);
        case 'gitlab-issue-comment-import':
          return t('task-importing-issue-comments-from-$repo', repo);
        case 'gitlab-merge-request-comment-import':
          return t('task-importing-merge-request-comments-from-$repo', repo);
      }
    }
  }

  function getDetails(task) {
    switch (task.action) {
      case 'gitlab-repo-import':
      case 'gitlab-user-import':
      case 'gitlab-hook-install':
      case 'gitlab-hook-remove':
      case 'gitlab-event-import':
      case 'gitlab-push-import':
      case 'gitlab-commit-comment-import':
      case 'gitlab-issue-comment-import':
      case 'gitlab-merge-request-comment-import':
      case 'gitlab-wiki-import':
        return formatAddedDeleteChanged(task.details);
      default:
        return '';
    }
  }
}

const sortTasks = memoizeWeak(null, function(tasks) {
  return _.orderBy(tasks, 'id', 'desc');
});

function formatAddedDeleteChanged(object) {
  let list = [];
  _.each(object.deleted, (s) => {
    pushItem(list, s, 'item deleted')
  });
  _.each(object.modified, (s) => {
    pushItem(list, s, 'item modified')
  });
  _.each(object.added, (s) => {
    pushItem(list, s, 'item added')
  });
  return list;
}

function pushItem(list, text, className) {
  let key = list.length;
  list.push(
    <span className={className} key={key}>
      {text}
    </span>
  );
}
