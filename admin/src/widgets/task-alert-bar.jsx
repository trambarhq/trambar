import Moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useProgress, useListener } from 'relaks';
import { findActiveTasks, findFailedTasks } from 'common/objects/finders/task-finder.js';
import { markTaskAsSeen, markTasksAsSeen } from 'common/objects/savers/task-saver.js';

import './task-alert-bar.scss';

/**
 * Bar at the bottom of the screen indicating active task running on the
 * remote server.
 */
export async function TaskAlertBar(props) {
  const { database } = props;
  const [ show ] = useProgress();

  try {
    render();
    const currentUserID = await database.start();
    const activeTasks = await findActiveTasks(database);
    render();
    const failedTasks = await findFailedTasks(database);
    render();

    function render() {
      const sprops = { ...props, activeTasks, failedTasks };
      show(<TaskAlertBarSync {...sprops} />);
    }
  } catch (err) {
    if (err.statusCode === 401) {
      show(null);
    } else {
      throw err;
    }
  }
}

function TaskAlertBarSync(props) {
  const { database, route, env } = props;
  const { activeTasks, failedTasks } = props;
  const { t } = env.locale;
  const selectedTask = activeTasks?.[0] || failedTasks?.[0];

  const handleClick = useListener(() => {
    if (failedTasks?.length > 0) {
      setTimeout(async() => {
        await markTasksAsSeen(database, failedTasks);
      }, 1000);
    }
  });

  useEffect(() => {
    if (selectedTask?.failed && env.focus) {
      const timeout = setTimeout(async () => {
        await markTaskAsSeen(database, selectedTask);
      }, 10 * 1000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [ selectedTask, env.focus ]);

  const classNames = [ 'task-alert-bar' ];
  if (selectedTask) {
    if (selectedTask.failed) {
      classNames.push('failure');
    }
    if (env.startTime > Moment().subtract(2, 'second').toISOString()) {
      // use a longer delay when page is just loading
      classNames.push('initial');
    }
  } else {
    classNames.push('hidden');
  }

  return (
    <div className={classNames.join(' ')}>
      <div className="inner-frame">
        {renderMessage()}
        {renderProgressBar()}
      </div>
    </div>
  );

  function renderMessage() {
    if (selectedTask) {
      const message = getMessage(selectedTask);
      const url = getURL(selectedTask);
      return <a href={url} onClick={handleClick}>{message}</a>;
    }
  }

  function renderProgressBar() {
    if (selectedTask) {
      const percent = selectedTask.completion + '%';
      return (
        <div className="progress-bar-frame">
          <div className="bar" style={{ width: percent }} />
        </div>
      );
    }
  }

  function getMessage(task) {
    const repo = task.options.repo;
    switch (task.action) {
      case 'gitlab-repo-import':
        return t('task-importing-repos');
      case 'gitlab-user-import':
        return t('task-importing-users');
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
      default:
        return '';
    }
  }

  function getURL(task) {
    const serverID = task?.options?.server_id;
    if (serverID) {
      const params = {
        serverID: serverID,
        scrollToTaskID: task.id,
      };
      return route.find('server-summary-page', params);
    } else {
      return null;
    }
  }
}
