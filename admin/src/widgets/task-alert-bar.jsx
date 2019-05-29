import _ from 'lodash';
import Moment from 'moment';
import React, { useState } from 'react';
import Relaks, { useProgress, useListener } from 'relaks';
import * as TaskFinder from 'common/objects/finders/task-finder.mjs';

import './task-alert-bar.scss';

/**
 * Bar at the bottom of the screen indicating active task running on the
 * remote server.
 */
async function TaskAlertBar(props) {
    const { database, route, env } = props;
    const { t } = env.locale;
    const [ lastErrorTime, setLastErrorTime ] = useState(localStorage.last_error_time);
    const [ show ] = useProgress();
    const db = database.use({ schema: 'global', by: this });

    const handleClick = useListener((evt) => {
        if (selectedTask.failed) {
            setLastErrorTime(selectedTask.mtime);
            localStorage.last_error_time = selectedTask.mtime;
        }
    });

    render();
    let selectedTask;
    try {
        const currentUserID = await db.start();
        const activeStartTime = Moment().subtract(8, 'hour').toISOString();
        const failureStartTime = lastErrorTime || Moment().subtract(7, 'day').toISOString();
        const activeTask = await TaskFinder.findActiveTask(db, activeStartTime);
        const failedTask = await TaskFinder.findFailedTask(db, failureStartTime);
        selectedTask = activeTask || failedTask;
    } catch (err) {
        if (err.statusCode !== 401) {
            throw err;
        }
    }
    render();

    function render() {
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
        show (
            <div className={classNames.join(' ')}>
                {renderMessage()}
                {renderProgressBar()}
            </div>
        );
    }

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
        const serverID = _.get(task, 'options.server_id');
        if (serverID) {
            let params = {
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
