import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Memoize from 'utils/memoize';
import TaskFinder from 'objects/finders/task-finder';

// widgets
import SmartList from 'widgets/smart-list';

import './task-list.scss';

class TaskList extends AsyncComponent {
    static displayName = 'TaskList';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env, server } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            tasks: null,
            server,
            route,
            env,
        };
        meanwhile.show(<TaskListSync {...props} />);
        return db.start().then((currentUserID) => {
            if (server) {
                return TaskFinder.findServerTasks(db, server).then((tasks) => {
                    props.tasks = tasks;
                });
            }
        }).then(() => {
            return <TaskListSync {...props} />;
        });
    }
}

class TaskListSync extends PureComponent {
    static displayName = 'TaskList.Sync';

    constructor(props) {
        super(props);
        let { route } = props;
        let taskID = props.params.task;
        return {
            expandedTaskIDs: (taskID) ? [ taskID ] : [],
        };
    }

    /**
     * Return text message describing task
     *
     * @param  {Task} task
     *
     * @return {String}
     */
    getMessage(task) {
        let { env } = this.props;
        let { t } = env.locale;
        if (task.completion === 100) {
            let repo = task.options.repo;
            let branch = task.options.branch;
            let added = _.size(task.details.added);
            let deleted = _.size(task.details.deleted);
            let modified = _.size(task.details.modified);
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
            let repo = task.options.repo;
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
            }
        }
    }

    /**
     * Return text describing task in greater details
     *
     * @param  {Task} task
     *
     * @return {String}
     */
    getDetails(task) {
        let { env } = this.props;
        let { t } = env.locale;
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
                return formatAddedDeleteChanged(task.details);
            default:
                return '';
        }
    }

    /**
     * Set container node
     *
     * @param  {HTMLDivElement} node
     */
    setContainerNode(node) {
        this.containerNode = node;
    }

    /**
     * Render component if it's active
     *
     * @return {ReactElement|null}
     */
    render() {
        let { route, tasks } = this.props;
        let taskID = route.params.task;
        let smartListProps = {
            items: sortTasks(tasks),
            offset: 5,
            behind: 20,
            ahead: 20,
            anchor: (taskID) ? `task-${hashParams.task}` : undefined,

            onIdentity: this.handleTaskIdentity,
            onRender: this.handleTaskRender,
            onAnchorChange: this.handleAnchorChange,
        };
        return (
            <div className="task-list" ref={this.setContainerNode}>
                <SmartList {...smartListProps} />
            </div>
        );
    }

    /**
     * Render a task
     *
     * @param  {Task} task
     *
     * @return {ReactElement|null}
     */
    renderTask(task) {
        let { expandedTaskIDs } = this.state;
        let className = 'task';
        if (task.failed) {
            className += ' failure';
        }
        if (_.includes(expandedTaskIDs, task.id)) {
            className += ' expanded';
        }
        return (
            <div className={className}>
                <div className="summary" data-task-id={task.id} onClick={this.handleTaskClick}>
                    {this.renderStartTime(task)}
                    {this.renderMessage(task)}
                    {this.renderProgress(task)}
                </div>
                {this.renderDetails(task)}
            </div>
        );
    }

    /**
     * Render the task's start time
     *
     * @param  {Task} task
     *
     * @return {ReactElement}
     */
    renderStartTime(task) {
        let time = Moment(task.ctime).format('YYYY-MM-DD HH:mm:ss');
        return <div className="start-time">{time}</div>;
    }

    /**
     * Render a brief description of the task
     *
     * @param  {Task} task
     *
     * @return {ReactElement}
     */
    renderMessage(task) {
        let message = this.getMessage(task);
        let badge;
        if (!message) {
            message = task.action + ' (noop)';
        }
        if (task.failed) {
            badge = <i className="fa fa-exclamation-triangle" />;
        }
        return <div className="message">{message}{badge}</div>;
    }

    /**
     * Render progress bar if task hasn't finished yet
     *
     * @param  {Task} task
     *
     * @return {ReactElement|null}
     */
    renderProgress(task) {
        let { env } = this.props;
        let { t } = env.locale;
        if (task.completion === 100 && task.etime) {
            let duration = Moment(task.etime) - Moment(task.ctime);
            let seconds = Math.ceil(duration / 1000);
            return <div className="duration">{t('task-$seconds', seconds)}</div>;
        } else {
            let percent = task.completion + '%';
            return (
                <div className="progress-bar-frame">
                    <div className="bar" style={{ width: percent }} />
                </div>
            );
        }
    }

    /**
     * Render details of a task if it's expanded
     *
     * @param  {Task} task
     *
     * @return {ReactElement|null}
     */
    renderDetails(task) {
        let { expandedTaskIDs } = this.state;
        if (!_.includes(expandedTaskIDs, task.id)) {
            return null;
        }
        let message = this.getDetails(task);
        return (
            <div>
                <div className="details">{message}</div>
                {this.renderError(task)}
            </div>
        );
    }

    /**
     * Render error if task failed with one
     *
     * @param  {Task} task
     *
     * @return {ReactElement|null}
     */
    renderError(task) {
        if (!task.failed) {
            return null;
        }
        let error = _.get(task, 'details.error.stack');
        if (!error) {
            error = _.get(task, 'details.error.message');
        }
        return <div className="error">{error}</div>;
    }

    /**
     * Scroll component into view if a task is specified by a hash
     */
    componentDidMount() {
        let { route } = this.props;
        if (route.params.task) {
            if (this.containerNode) {
                this.containerNode.scrollIntoView();
            }
        }
    }

    /**
     * Called when SmartList wants an item's id
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleTaskIdentity = (evt) => {
        return `task-${evt.item.id}`;
    }

    /**
     * Called when SmartList wants to render an item
     *
     * @param  {Object} evt
     *
     * @return {ReactElement}
     */
    handleTaskRender = (evt) => {
        if (evt.needed) {
            return this.renderTask(evt.item);
        } else {
            return <div className="task" />;
        }
    }

    /**
     * Called when user clicks on a task
     *
     * @param  {Event} evt
     */
    handleTaskClick = (evt) => {
        let { expandedTaskIDs } = this.state;
        let taskID = parseInt(evt.currentTarget.getAttribute('data-task-id'));
        if (_.includes(expandedTaskIDs, taskID)) {
            expandedTaskIDs = _.without(expandedTaskIDs, taskID);
        } else {
            expandedTaskIDs = _.concat(expandedTaskIDs, taskID);
        }
        this.setState({ expandedTaskIDs });
    }

    /**
     * Called when user scrolls to a different item
     *
     * @param  {Object} evt
     */
    handleAnchorChange = (evt) => {
        let { route } = this.props;
        route.reanchor('');
    }
}

let sortTasks = Memoize(function(tasks) {
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

export {
    TaskList as default,
    TaskList,
    TaskListSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    TaskList.propTypes = {
        server: PropTypes.object,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    TaskListSync.propTypes = {
        tasks: PropTypes.arrayOf(PropTypes.object),
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
