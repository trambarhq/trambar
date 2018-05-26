var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var TaskFinder = require('objects/finders/task-finder');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var SmartList = require('widgets/smart-list');

require('./task-list.scss');

module.exports = Relaks.createClass({
    displayName: 'TaskList',
    propTypes: {
        server: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        /**
         * Extract id from URL hash
         *
         * @param  {String} hash
         *
         * @return {Object}
         */
        parseHash: function(hash) {
            var task = Route.parseId(hash, /t(\d+)/);
            return { task };
        },

        /**
         * Get URL hash based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getHash: function(params) {
            if (params.task) {
                return `t${params.task}`;
            }
            return '';
        },
    },


    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            tasks: null,
            server: this.props.server,
            locale: this.props.locale,
            route: this.props.route,
            theme: this.props.theme,
        };
        meanwhile.show(<TaskListSync {...props} />);
        return db.start().then((userId) => {
            if (this.props.server) {
                return TaskFinder.findServerTasks(db, props.server).then((tasks) => {
                    props.tasks = tasks;
                });
            }
        }).then(() => {
            return <TaskListSync {...props} />;
        });
    },
});

var TaskListSync = module.exports.Sync = React.createClass({
    displayName: 'TaskList.Sync',
    propTypes: {
        tasks: PropTypes.arrayOf(PropTypes.object),

        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var hashParams = module.exports.parseHash(this.props.route.hash);
        return {
            expandedTaskIds: (hashParams.task) ? [ hashParams.task ] : [],
        };
    },

    /**
     * Return text message describing task
     *
     * @param  {Task} task
     *
     * @return {String}
     */
    getMessage: function(task) {
        var t = this.props.locale.translate;
        if (task.completion === 100) {
            switch (task.action) {
                case 'gitlab-repo-import':
                    var added = _.size(task.details.added);
                    var deleted = _.size(task.details.deleted);
                    var modified = _.size(task.details.modified);
                    if (added) {
                        return t('task-imported-$count-repos', added);
                    } else if (deleted) {
                        return t('task-removed-$count-repos', deleted);
                    } else if (modified) {
                        return t('task-updated-$count-repos', modified);
                    }
                    break;
                case 'gitlab-user-import':
                    var added = _.size(task.details.added);
                    var deleted = _.size(task.details.deleted);
                    var modified = _.size(task.details.modified);
                    if (added) {
                        return t('task-imported-$count-users', added);
                    } else if (deleted) {
                        return t('task-removed-$count-users', deleted);
                    } else if (modified) {
                        return t('task-updated-$count-users', modified);
                    }
                    break;
                case 'gitlab-hook-install':
                    var added = _.size(task.details.added);
                    return t('task-installed-$count-hooks', added);
                case 'gitlab-hook-remove':
                    var deleted = _.size(task.details.deleted);
                    return t('task-removed-$count-hooks', deleted);
                case 'gitlab-event-import':
                    var added = _.size(task.details.added);
                    var repo = task.options.repo;
                    return t('task-imported-$count-events-from-$repo', added, repo);
                case 'gitlab-push-import':
                    var added = _.size(task.details.added);
                    var repo = task.options.repo;
                    var branch = task.options.branch;
                    return t('task-imported-push-with-$count-commits-from-$repo-$branch', added, repo, branch);
                case 'gitlab-commit-comment-import':
                    var added = _.size(task.details.added);
                    var repo = task.options.repo;
                    return t('task-imported-$count-commit-comments-from-$repo', added, repo);
                case 'gitlab-issue-comment-import':
                    var added = _.size(task.details.added);
                    var repo = task.options.repo;
                    return t('task-imported-$count-issue-comments-from-$repo', added, repo);
                case 'gitlab-merge-request-comment-import':
                    var added = _.size(task.details.added);
                    var repo = task.options.repo;
                    return t('task-imported-$count-merge-request-comments-from-$repo', added, repo);
            }
        } else {
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
                    var repo = task.options.repo;
                    return t('task-importing-events-from-$repo', repo);
                case 'gitlab-push-import':
                    var repo = task.options.repo;
                    return t('task-importing-push-from-$repo', repo);
                case 'gitlab-commit-comment-import':
                    var repo = task.options.repo;
                    return t('task-importing-commit-comments-from-$repo', repo);
                case 'gitlab-issue-comment-import':
                    var repo = task.options.repo;
                    return t('task-importing-issue-comments-from-$repo', repo);
                case 'gitlab-merge-request-comment-import':
                    var repo = task.options.repo;
                    return t('task-importing-merge-request-comments-from-$repo', repo);
            }
        }
    },

    /**
     * Return text describing task in greater details
     *
     * @param  {Task} task
     *
     * @return {String}
     */
    getDetails: function(task) {
        var t = this.props.locale.translate;
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
    },

    /**
     * Set container node
     *
     * @param  {HTMLDivElement} node
     */
    setContainerNode: function(node) {
        this.containerNode = node;
    },

    /**
     * Render component if it's active
     *
     * @return {ReactElement|null}
     */
    render: function() {
        var anchor;
        var hashParams = module.exports.parseHash(this.props.route.hash);
        if (hashParams.task) {
            anchor = `task-${hashParams.task}`;
        }
        var smartListProps = {
            items: sortTasks(this.props.tasks),
            offset: 5,
            behind: 20,
            ahead: 20,
            anchor: anchor,

            onIdentity: this.handleTaskIdentity,
            onRender: this.handleTaskRender,
            onAnchorChange: this.handleAnchorChange,
        };
        return (
            <div className="task-list" ref={this.setContainerNode}>
                <SmartList {...smartListProps} />
            </div>
        );
    },

    /**
     * Render a task
     *
     * @param  {Task} task
     *
     * @return {ReactElement|null}
     */
    renderTask: function(task) {
        var className = 'task';
        if (task.failed) {
            className += ' failure';
        }
        if (_.includes(this.state.expandedTaskIds, task.id)) {
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
    },

    /**
     * Render the task's start time
     *
     * @param  {Task} task
     *
     * @return {ReactElement}
     */
    renderStartTime: function(task) {
        var time = Moment(task.ctime).format('YYYY-MM-DD HH:mm:ss');
        return <div className="start-time">{time}</div>;
    },

    /**
     * Render a brief description of the task
     *
     * @param  {Task} task
     *
     * @return {ReactElement}
     */
    renderMessage: function(task) {
        var message = this.getMessage(task);
        var badge;
        if (!message) {
            message = task.action + ' (noop)';
        }
        if (task.failed) {
            badge = <i className="fa fa-exclamation-triangle" />;
        }
        return <div className="message">{message}{badge}</div>;
    },

    /**
     * Render progress bar if task hasn't finished yet
     *
     * @param  {Task} task
     *
     * @return {ReactElement|null}
     */
    renderProgress: function(task) {
        if (task.completion === 100 && task.etime) {
            var t = this.props.locale.translate;
            var duration = Moment(task.etime) - Moment(task.ctime);
            var seconds = Math.ceil(duration / 1000);
            return <div className="duration">{t('task-$seconds', seconds)}</div>;
        } else {
            var percent = task.completion + '%';
            return (
                <div className="progress-bar-frame">
                    <div className="bar" style={{ width: percent }} />
                </div>
            );
        }
    },

    /**
     * Render details of a task if it's expanded
     *
     * @param  {Task} task
     *
     * @return {ReactElement|null}
     */
    renderDetails: function(task) {
        if (!_.includes(this.state.expandedTaskIds, task.id)) {
            return null;
        }
        var message = this.getDetails(task);
        return (
            <div>
                <div className="details">{message}</div>
                {this.renderError(task)}
            </div>
        );
    },

    /**
     * Render error if task failed with one
     *
     * @param  {Task} task
     *
     * @return {ReactElement|null}
     */
    renderError: function(task) {
        if (!task.failed) {
            return null;
        }
        var error = _.get(task, 'details.error.stack');
        if (!error) {
            error = _.get(task, 'details.error.message');
        }
        return <div className="error">{error}</div>;
    },

    /**
     * Scroll component into view if a task is specified by a hash
     */
    componentDidMount: function() {
        var hashParams = module.exports.parseHash(this.props.route.hash);
        if (hashParams.task) {
            if (this.containerNode) {
                this.containerNode.scrollIntoView();
            }
        }
    },

    /**
     * Called when SmartList wants an item's id
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleTaskIdentity: function(evt) {
        return `task-${evt.item.id}`;
    },

    /**
     * Called when SmartList wants to render an item
     *
     * @param  {Object} evt
     *
     * @return {ReactElement}
     */
    handleTaskRender: function(evt) {
        if (evt.needed) {
            return this.renderTask(evt.item);
        } else {
            return <div className="task" />;
        }
    },

    /**
     * Called when user clicks on a task
     *
     * @param  {Event} evt
     */
    handleTaskClick: function(evt) {
        var taskId = parseInt(evt.currentTarget.getAttribute('data-task-id'));
        var expandedTaskIds = _.slice(this.state.expandedTaskIds);
        if (_.includes(expandedTaskIds, taskId)) {
            _.pull(expandedTaskIds, taskId);
        } else {
            expandedTaskIds.push(taskId);
        }
        this.setState({ expandedTaskIds });
    },

    /**
     * Called when user scrolls to a different item
     *
     * @param  {Object} evt
     */
    handleAnchorChange: function(evt) {
        this.props.route.reanchor('');
    },
});

var sortTasks = Memoize(function(tasks) {
    return _.orderBy(tasks, 'id', 'desc');
});

function formatAddedDeleteChanged(object) {
    var list = [];
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
    var key = list.length;
    list.push(
        <span className={className} key={key}>
            {text}
        </span>
    );
}
