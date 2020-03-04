import _ from 'lodash';
import { delay } from 'bluebird';
import Moment from 'moment';
import React, { useEffect } from 'react';
import Relaks, { useProgress, useListener } from 'relaks';
import * as TaskFinder from 'common/objects/finders/task-finder.js';
import * as TaskSaver from 'common/objects/savers/task-saver.js';

import './task-alert-bar.scss';

/**
 * Bar at the bottom of the screen indicating active task running on the
 * remote server.
 */
async function TaskAlertBar(props) {
  const { database } = props;
  const [ show ] = useProgress();

  try {
    render();
    const currentUserID = await database.start();
    const activeTasks = await TaskFinder.findActiveTasks(database);
    render();
    const failedTasks = await TaskFinder.findFailedTasks(database);
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
  const selectedTask = _.first(activeTasks) || _.first(failedTasks);

  const handleClick = useListener(async () => {
    if (!_.isEmpty(failedTasks)) {
      await TaskSaver.markTasksAsSeen(database, failedTasks);
    }
  });

  useEffect(() => {
    if (selectedTask?.failed && env.focus) {
      const timeout = setTimeout(async () => {
        await TaskSaver.markTaskAsSeen(database, selectedTask);
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
      {renderMessage()}
      {renderProgressBar()}
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

const component = Relaks.memo(TaskAlertBar);

export {
  component as default,
  component as TaskAlertBar,
};
