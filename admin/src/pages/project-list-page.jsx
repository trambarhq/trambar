/**
 * ProjectListPage - React component
 *
 * Displays a table listing all active projects in the system.
 *
 */
var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var DailyActivities = require('data/daily-activities');

// widgets
var PushButton = require('widgets/push-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var UserTooltip = require('widgets/user-tooltip');
var RepositoryTooltip = require('widgets/repository-tooltip');
var ActivityTooltip = require('widgets/activity-tooltip');
var ModifiedTimeTooltip = require('widgets/modified-time-tooltip')

require('./project-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'ProjectListPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        /**
         * Match current URL against the page's
         *
         * @param  {String} url
         *
         * @return {Object|null}
         */
        parseUrl: function(url) {
            return Route.match('/projects/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         * @param  {Object} query
         *
         * @return {String}
         */
        getUrl: function(params, query) {
            return `/projects/`;
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
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        var props = {
            projects: null,
            repos: null,
            users: null,
            statistics: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ProjectListPageSync {...props} />);
        return db.start().then((currentUserId) => {
            // load all projects
            var criteria = {};
            return db.find({ table: 'project', criteria });
        }).then((projects) => {
            props.projects = projects;
            meanwhile.show(<ProjectListPageSync {...props} />);
        }).then(() => {
            // load repos
            var criteria = {
                id: _.flatten(_.map(props.projects, 'repo_ids'))
            };
            return db.find({ table: 'repo', criteria });
        }).then((repos) => {
            props.repos = repos;
            meanwhile.show(<ProjectListPageSync {...props} />);
        }).then(() => {
            // load members of projects
            var criteria = {
                id: _.flatten(_.map(props.projects, 'user_ids'))
            };
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            meanwhile.show(<ProjectListPageSync {...props} />);
        }).then(() => {
            // load statistics of each project
            return DailyActivities.loadProjectStatistics(db, props.projects);
        }).then((statistics) => {
            props.statistics = statistics;
            return <ProjectListPageSync {...props} />;
        });
    }
});

var ProjectListPageSync = module.exports.Sync = React.createClass({
    displayName: 'ProjectListPage.Sync',
    propTypes: {
        projects: PropTypes.arrayOf(PropTypes.object),
        repos: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),
        statistics: PropTypes.objectOf(PropTypes.object),

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
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <div className="project-list-page">
                {this.renderButtons()}
                <h2>{t('project-list-title')}</h2>
                {this.renderTable()}
            </div>
        );
    },

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        return (
            <div className="buttons">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('project-list-new')}
                </PushButton>
            </div>
        );
    },

    /**
     * Render a table
     *
     * @return {ReactElement}
     */
    renderTable: function() {
        var t = this.props.locale.translate;
        var tableProps = {
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        return (
            <SortableTable {...tableProps}>
                <thead>
                    {this.renderHeadings()}
                </thead>
                <tbody>
                    {this.renderRows()}
                </tbody>
            </SortableTable>
        );
    },

    /**
     * Render table headings
     *
     * @return {ReactElement}
     */
    renderHeadings: function() {
        return (
            <tr>
                {this.renderTitleColumn()}
                {this.renderUsersColumn()}
                {this.renderRepositoriesColumn()}
                {this.renderDateRangeColumn()}
                {this.renderLastMonthColumn()}
                {this.renderThisMonthColumn()}
                {this.renderToDateColumn()}
                {this.renderModifiedTimeColumn()}
            </tr>
        );
    },

    /**
     * Render table rows
     *
     * @return {Array<ReactElement>}
     */
    renderRows: function() {
        var projects = sortProjects(
            this.props.projects,
            this.props.users,
            this.props.repos,
            this.props.statistics,
            this.props.locale,
            this.state.sortColumns,
            this.state.sortDirections
        );
        return _.map(projects, this.renderRow);
    },

    /**
     * Render a table row
     *
     * @param  {Object} project
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderRow: function(project, i) {
        return (
            <tr key={i}>
                {this.renderTitleColumn(project)}
                {this.renderUsersColumn(project)}
                {this.renderRepositoriesColumn(project)}
                {this.renderDateRangeColumn(project)}
                {this.renderLastMonthColumn(project)}
                {this.renderThisMonthColumn(project)}
                {this.renderToDateColumn(project)}
                {this.renderModifiedTimeColumn(project)}
            </tr>
        );
    },

    /**
     * Render title column, either the heading or a data cell
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement}
     */
    renderTitleColumn: function(project) {
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="title">{t('table-heading-name')}</TH>;
        } else {
            var p = this.props.locale.pick;
            var title = p(project.details.title);
            var url = require('pages/project-summary-page').getUrl({ projectId: project.id });
            return (
                <td>
                    <a href={url}>
                        {t('project-list-$title-with-$name', title, project.name)}
                    </a>
                </td>
            );
        }
    },

    /**
     * Render users column, either the heading or a data cell
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderUsersColumn: function(project) {
        if (this.props.theme.isBelowMode('narrow')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="users">{t('table-heading-users')}</TH>;
        } else {
            var props = {
                users: findUsers(this.props.users, project),
                project,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><UserTooltip {...props} /></td>;
        }
    },

    /**
     * Render repositories column, either the heading or a data cell
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderRepositoriesColumn: function(project) {
        if (this.props.theme.isBelowMode('narrow')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="repos">{t('table-heading-repositories')}</TH>
        } else {
            var props = {
                repos: findRepos(this.props.repos, project),
                project,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><RepositoryTooltip {...props} /></td>;
        }
    },

    /**
     * Render active period column, either the heading or a data cell
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderDateRangeColumn: function(project) {
        if (this.props.theme.isBelowMode('wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="range">{t('table-heading-date-range')}</TH>
        } else {
            var start, end;
            var range = _.get(this.props.statistics, [ project.id, 'range' ]);
            if (range) {
                start = Moment(range.start).format('ll');
                end = Moment(range.end).format('ll');
            }
            return <td>{t('date-range-$start-$end', start, end)}</td>;
        }
    },

    /**
     * Render column showing the number of stories last month
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderLastMonthColumn: function(project) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="last_month">{t('table-heading-last-month')}</TH>
        } else {
            var props = {
                statistics: _.get(this.props.statistics, [ project.id, 'last_month' ]),
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the number of stories this month
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderThisMonthColumn: function(project) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="this_month">{t('table-heading-this-month')}</TH>
        } else {
            var props = {
                statistics: _.get(this.props.statistics, [ project.id, 'this_month' ]),
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the number of stories to date
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderToDateColumn: function(project) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="to_date">{t('table-heading-to-date')}</TH>
        } else {
            var props = {
                statistics: _.get(this.props.statistics, [ project.id, 'to_date' ]),
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn: function(project) {
        if (this.props.theme.isBelowMode('standard')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            return <td><ModifiedTimeTooltip time={project.mtime} /></td>;
        }
    },

    /**
     * Called when user clicks a table heading
     *
     * @param  {Object} evt
     */
    handleSort: function(evt) {
        this.setState({
            sortColumns: evt.columns,
            sortDirections: evt.directions
        });
    },

    /**
     * Called when user clicks new button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        var url = require('pages/project-summary-page').getUrl({
            projectId: 'new'
        });
        return this.props.route.change(url);
    },
});

var sortProjects = Memoize(function(projects, users, repos, statistics, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (project) => {
                    return locale.pick(project.details.title)
                };
            case 'users':
                return (project) => {
                    return _.size(findUsers(users, project));
                };
            case 'repos':
                return (project) => {
                    return _.size(findUsers(repos, project));
                };
            case 'range':
                return (project) => {
                    return _.get(this.props.statistics, [ project.id, 'range', 'start' ], '');
                };
            case 'last_month':
                return (project) => {
                    return _.get(this.props.statistics, [ project.id, 'last_month', 'total' ], 0);
                };
            case 'this_month':
                return (project) => {
                    return _.get(this.props.statistics, [ project.id, 'this_month', 'total' ], 0);
                };
            case 'to_date':
                return (project) => {
                    return _.get(this.props.statistics, [ project.id, 'to_date', 'total' ], 0);
                };
            default:
                return column;
        }
    });
    return _.orderBy(projects, columns, directions);
});

var findRepos = Memoize(function(repos, project) {
    var hash = _.keyBy(repos, 'id');
    return _.filter(_.map(project.repo_ids, (id) => {
        return hash[id];
    }));
});

var findUsers = Memoize(function(users, project) {
    var hash = _.keyBy(users, 'id');
    return _.filter(_.map(project.user_ids, (id) => {
        return hash[id];
    }));
});
