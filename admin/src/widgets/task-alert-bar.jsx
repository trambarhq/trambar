import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as TaskFinder from 'objects/finders/task-finder';

import './task-alert-bar.scss';

/**
 * Bar at the bottom of the screen indicating active task running on the
 * remote server. This is the asynchronous part that retrieves the
 * necessary data.
 *
 * @extends AsyncComponent
 */
class TaskAlertBar extends AsyncComponent {
    static displayName = 'TaskAlertBar';

    constructor(props) {
        super(props);
        this.state = {
            searchStartTime: this.getSearchStartTime(),
        };
    }

    /**
     * Return a timestamp that's a few hours ahead
     *
     * @return {String}
     */
    getSearchStartTime() {
        return Moment().subtract(8, 'hour').startOf('hour').toISOString();
    }

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env } = this.props;
        let { searchStartTime } = this.state;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            route,
            env,
        };
        meanwhile.show(<TaskAlertBarSync {...props} />);
        try {
            let currentUserID = await db.start();
            props.tasks = await TaskFinder.findActiveTasks(db, searchStartTime)
            return <TaskAlertBarSync {...props} />;
        } catch (err) {
            if (err.statusCode === 401) {
                // user is logging out, presumably
                return null;
            } else {
                throw err;
            }
        }
    }

    /**
     * Use interval function to update search start time
     */
    componentDidMount() {
        this.hourChangeTimeout = setInterval(() => {
            let { searchStartTime } = this.state;
            let searchStartTimeAfter = this.getSearchStartTime();
            if (searchStartTimeAfter !== searchStartTime) {
                this.setState({ searchStartTime: searchStartTimeAfter });
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Clear interval function on unmount
     */
    componentWillUnmount() {
        clearInterval(this.hourChangeInterval);
    }
}

/**
 * Synchronous component that actually renders the alert bar.
 *
 * @extends PureComponent
 */
class TaskAlertBarSync extends PureComponent {
    static displayName = 'TaskAlertBarSync';

    constructor(props) {
        super(props);
        this.state = {
            showing: false,
            rendering: false,
            hidden: true,
            selectedTask: null,
            highestTaskID: 0,
        };
    }

    /**
     * Return text message describing task
     *
     * @return {String}
     */
    getMessage() {
        let { env } = this.props;
        let { selectedTask } = this.state;
        let { t } = env.locale;
        let repo = selectedTask.options.repo;
        switch (selectedTask.action) {
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

    /**
     * Return a URL for the task if applicable
     *
     * @return {String|null}
     */
    getURL() {
        let { route } = this.props;
        let { selectedTask } = this.state;
        let url = null;
        let serverID = _.get(selectedTask, 'options.server_id');
        if (serverID) {
            let params = {
                serverID: serverID,
                scrollToTaskID: selectedTask.id,
            };
            url = route.find('server-summary-page', params);
        }
        return url;
    }

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { tasks } = this.props;
        let { highestTaskID } = this.state;
        if (nextProps.tasks !== tasks) {
            let activeTasks = _.sortBy(_.filter(nextProps.tasks, { failed: false }), 'ctime');
            let selectedTask = _.first(activeTasks);
            if (selectedTask) {
                if (selectedTask.id > highestTaskID) {
                    highestTaskID = selectedTask.id;
                }
            } else {
                let failedTasks = _.sortBy(_.filter(nextProps.tasks, { failed: true }, 'ctime'));
                selectedTask = _.find(failedTasks, (task) => {
                    // find one that's more recent than the last progress item
                    if (task.id >= highestTaskID) {
                        return true;
                    }
                });
            }
            if (selectedTask) {
                this.setState({ selectedTask, highestTaskID, showing: true });
            } else {
                let currentSelectedTask = this.state.selectedTask;
                setTimeout(() => {
                    // stop showing it after 5 seconds
                    let { selectedTask } = this.state;
                    if (currentSelectedTask === selectedTask) {
                        this.setState({ showing: false });
                    }
                }, 5000);
            }
        }
    }

    /**
     * Render component if it's active
     *
     * @return {ReactElement|null}
     */
    render() {
        let { selectedTask, rendering, hidden } = this.state;
        if (!rendering) {
            return null;
        }
        let className = 'task-alert-bar';
        if (hidden) {
            className += ' hidden';
        }
        if (selectedTask.failed) {
            className += ' failure';
        }
        return (
            <div className={className}>
                {this.renderMessage()}
                {this.renderProgressBar()}
            </div>
        );
    }

    /**
     * Render description of current task
     *
     * @return {ReactElement}
     */
    renderMessage() {
        let { selectedTask } = this.state;
        let message = this.getMessage(selectedTask);
        let url = this.getURL(selectedTask);
        return (
            <a href={url}>{message}</a>
        );
    }

    /**
     * Render progress bar for current task
     *
     * @return {ReactElement}
     */
    renderProgressBar() {
        let { selectedTask } = this.state;
        let percent = selectedTask.completion + '%';
        return (
            <div className="progress-bar-frame">
                <div className="bar" style={{ width: percent }} />
            </div>
        );
    }

    /**
     * Transition in DOM element once it's created
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { env } = this.props;
        let { showing, rendering } = this.state;
        if (!prevState.showing && showing) {
            if (!rendering) {
                this.setState({ rendering: true, hidden: true });
            }
        } else if (prevState.showing && !showing) {
            this.setState({ hidden: true });
            setTimeout(() => {
                let { showing } = this.state;
                if (!showing) {
                    this.setState({ rendering: false });
                }
            }, 500);
        } else if (!prevState.rendering && rendering) {
            let delay = 10;
            if (env.startTime > Moment().subtract(2, 'second').toISOString()) {
                // use a longer delay when page is just loading
                delay = 2000;
            }
            setTimeout(() => {
                if (this.mounted !== false) {
                    this.setState({ hidden: false });
                }
            }, delay);
        }
    }

    /**
     * Remember that the component has been unmounted to avoid React warning
     * concerning calling setState on unmounted component
     */
    componentWillUnmount() {
        this.mounted = false;
    }
}

export {
    TaskAlertBar as default,
    TaskAlertBar,
    TaskAlertBarSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    TaskAlertBar.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    TaskAlertBarSync.propTypes = {
        tasks: PropTypes.arrayOf(PropTypes.object),
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
