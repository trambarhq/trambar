var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var SessionStartTime = require('data/session-start-time');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

require('./task-alert-bar.scss');

module.exports = Relaks.createClass({
    displayName: 'TaskAlertBar',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
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
        return {
            searchStartTime: this.getSearchStartTime(),
        };
    },

    /**
     * Return a timestamp that's a few hours ahead
     *
     * @return {String}
     */
    getSearchStartTime: function() {
        return Moment().subtract(8, 'hour').startOf('hour').toISOString();
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
            activeTasks: null,
            failedTasks: null,

            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<TaskAlertBarSync {...props} />);
        return db.start().then((userId) => {
            // load active tasks
            var criteria = {
                etime: null,
                deleted: false,
                newer_than: this.state.searchStartTime,
                limit: 10,
            };
            return db.find({ table: 'task', criteria });
        }).then((tasks) => {
            props.activeTasks = tasks;
            return meanwhile.show(<TaskAlertBarSync {...props} />);
        }).then(() => {
            var criteria = {
                failed: true,
                newer_than: this.state.searchStartTime,
                limit: 10,
            };
            return db.find({ table: 'task', criteria });
        }).then((tasks) => {
            props.failedTasks = tasks;
            return <TaskAlertBarSync {...props} />;
        });
    },

    /**
     * Use interval function to update search start time
     */
    componentDidMount: function() {
        this.hourChangeTimeout = setInterval(() => {
            var searchStartTime = this.getSearchStartTime();
            if (this.state.searchStartTime !== searchStartTime) {
                this.setState({ searchStartTime });
            }
        }, 5 * 60 * 1000);
    },

    /**
     * Clear interval function on unmount
     */
    componentWillUnmount: function() {
        clearInterval(this.hourChangeInterval);
    },
});

var TaskAlertBarSync = module.exports.Sync = React.createClass({
    displayName: 'TaskAlertBar.Sync',
    propTypes: {
        activeTasks: PropTypes.arrayOf(PropTypes.object),
        failedTasks: PropTypes.arrayOf(PropTypes.object),

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
        return {
            showing: false,
            rendering: false,
            hidden: true,
            selectedTask: null,
        };
    },

    /**
     * Return text message describing task
     *
     * @return {String}
     */
    getMessage: function() {
        var t = this.props.locale.translate;
        var task = this.state.selectedTask;
        switch (task.action) {
            case 'gitlab-event-import':
                return t('task-importing-events', task.options.repo);
            case 'gitlab-user-import':
                return t('task-importing-users');
            case 'gitlab-repo-import':
                return t('task-importing-repos');
            case 'gitlab-hook-install':
                return t('task-installing-hooks');
            case 'gitlab-hook-remove':
                return t('task-removing-hooks');
            default:
                return '';
        }
    },

    /**
     * Return a URL for the task if applicable
     *
     * @return {String|null}
     */
    getUrl: function() {
        var task = this.state.selectedTask;
        var url = null;
        if (task.server_id) {
            var route = this.props.route;
            url = route.find(require('pages/server-summary-page'), {
                server: task.server_id,
                task: task.id,
            });
        }
        return url;
    },

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.activeTasks !== nextProps.activeTasks || this.props.failedTasks !== nextProps.failedTasks) {
            var selectedTask = _.first(_.sortBy(nextProps.activeTasks, 'ctime'));
            if (!selectedTask) {
                selectedTask = _.last(_.sortBy(nextProps.failedTasks, 'ctime'));
            }
            if (selectedTask) {
                this.setState({ selectedTask, showing: true });
            } else {
                var currentSelectedTask = this.state.selectedTask;
                setTimeout(() => {
                    // stop showing it after 5 seconds
                    if (currentSelectedTask === this.state.selectedTask) {
                        this.setState({ showing: false });
                    }
                }, 5000);
            }
        }
    },

    /**
     * Render component if it's active
     *
     * @return {ReactElement|null}
     */
    render: function() {
        if (!this.state.rendering) {
            return null;
        }
        var className = 'task-alert-bar';
        if (this.state.hidden) {
            className += ' hidden';
        }
        var task = this.state.selectedTask;
        if (task.failed) {
            className += ' failure';
        }
        return (
            <div className={className}>
                {this.renderMessage()}
                {this.renderProgressBar()}
            </div>
        );
    },

    renderMessage: function() {
        var message = this.getMessage(this.state.selectedTask);
        var url = this.getUrl(this.state.selectedTask);
        return (
            <a href={url}>{message}</a>
        );
    },

    renderProgressBar: function() {
        var task = this.state.selectedTask;
        var percent = task.completion + '%';
        return (
            <div className="progress-bar-frame">
                <div className="bar" style={{ width: percent }} />
            </div>
        );
    },

    /**
     * Transition in DOM element once it's created
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!prevState.showing && this.state.showing) {
            if (!this.state.rendering) {
                this.setState({ rendering: true, hidden: true });
            }
        } else if (prevState.showing && !this.state.showing) {
            this.setState({ hidden: true });
            setTimeout(() => {
                if (!this.state.showing) {
                    this.setState({ rendering: false });
                }
            }, 500);
        } else if (!prevState.rendering && this.state.rendering) {
            var delay = 10;
            if (SessionStartTime > Moment().subtract(2, 'second').toISOString()) {
                // use a longer delay when page is just loading
                //delay = 2000;
            }
            setTimeout(() => {
                this.setState({ hidden: false });
            }, delay);
        }
    },
});
