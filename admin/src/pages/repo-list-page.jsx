var _ = require('lodash');
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
var ActivityTooltip = require('widgets/activity-tooltip');
var ModifiedTimeTooltip = require('widgets/modified-time-tooltip')

require('./repo-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'RepoListPage',
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
            return Route.match('/projects/:projectId/repos/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getUrl: function(params) {
            return `/projects/${params.projectId}/repos/`;
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
            project: null,
            repos: null,
            servers: null,
            statistics: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RepoListPageSync {...props} />);
        return db.start().then((userId) => {
            // load project
            var criteria = {
                id: this.props.route.parameters.projectId
            };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load repos
            var criteria = {
                id: [ props.project.repo_ids ]
            };
            return db.find({ table: 'repo', criteria });
        }).then((repos) => {
            props.repos = repos;
            meanwhile.show(<RepoListPageSync {...props} />);
        }).then(() => {
            // load servers
            var criteria = {
                id: _.map(props.repos, 'server_id')
            };
            return db.find({ table: 'server', criteria });
        }).then((servers) => {
            props.servers = servers;
            meanwhile.show(<RepoListPageSync {...props} />);
        }).then(() => {
            // load user statistics
            return DailyActivities.loadRepoStatistics(db, props.project, props.repos);
        }).then((statistics) => {
            props.statistics = statistics;
            return <RepoListPageSync {...props} />;
        });
    }
});

var RepoListPageSync = module.exports.Sync = React.createClass({
    displayName: 'RepoListPage.Sync',
    propTypes: {
        repos: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object,
        servers: PropTypes.arrayOf(PropTypes.object),
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
            <div className="repo-list-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('repo-list-edit')}
                </PushButton>
                <h2>{t('repo-list-title')}</h2>
                {this.renderTable()}
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
        var repos = sortRepos(this.props.repos, this.props.locale, this.state.sortColumns, this.state.sortDirections);
        return (
            <SortableTable {...tableProps}>
                <thead>
                    <tr>
                        {this.renderTitleColumn()}
                        {this.renderServerColumn()}
                        {this.renderIssueTrackerColumn()}
                        {this.renderDateRangeColumn()}
                        {this.renderLastMonthColumn()}
                        {this.renderThisMonthColumn()}
                        {this.renderToDateColumn()}
                        {this.renderModifiedTimeColumn()}
                    </tr>
                </thead>
                <tbody>
                    {_.map(repos, this.renderRow)}
                </tbody>
            </SortableTable>
        );
    },

    /**
     * Render a table row
     *
     * @param  {Object} repo
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderRow: function(repo, i) {
        return (
            <tr key={i}>
                {this.renderTitleColumn(repo)}
                {this.renderServerColumn(repo)}
                {this.renderIssueTrackerColumn(repo)}
                {this.renderDateRangeColumn(repo)}
                {this.renderLastMonthColumn(repo)}
                {this.renderThisMonthColumn(repo)}
                {this.renderToDateColumn(repo)}
                {this.renderModifiedTimeColumn(repo)}
            </tr>
        );
    },

    /**
     * Render name column, either the heading or a data cell
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement}
     */
    renderTitleColumn: function(repo) {
        var t = this.props.locale.translate;
        if (!repo) {
            return <TH id="name">{t('table-heading-name')}</TH>;
        } else {
            var p = this.props.locale.pick;
            var title = p(repo.details.title) || repo.details.name;
            var url = require('pages/repo-summary-page').getUrl({
                projectId: this.props.route.parameters.projectId,
                repoId: repo.id
            });
            return (
                <td>
                    <a href={url}>
                        {title}
                    </a>
                </td>
            );
        }
    },

    /**
     * Render server column, either the heading or a data cell
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderServerColumn: function(repo) {
        var t = this.props.locale.translate;
        if (!repo) {
            return <TH id="range">{t('table-heading-server')}</TH>
        } else {
            var p = this.props.locale.pick;
            var server = findServer(this.props.servers, repo);
            var label;
            if (server) {
                label = p(server.details.title) || server.name || '-';
            }
            return <td>{label}</td>;
        }
    },

    /**
     * Render issue tracker column, either the heading or a data cell
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderIssueTrackerColumn: function(repo) {
        if (this.props.theme.isBelowMode('narrow')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!repo) {
            return <TH id="range">{t('table-heading-issue-tracker')}</TH>
        } else {
            var p = this.props.locale.pick;
            var enabled = !!repo.details.issues_enabled;
            return <td>{t(`repo-list-issue-tracker-enabled-${enabled}`)}</td>;
        }
    },

    /**
     * Render active period column, either the heading or a data cell
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderDateRangeColumn: function(repo) {
        if (this.props.theme.isBelowMode('wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!repo) {
            return <TH id="range">{t('table-heading-date-range')}</TH>
        } else {
            var start, end;
            var range = _.get(this.props.statistics, [ repo.id, 'range' ]);
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
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderLastMonthColumn: function(repo) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!repo) {
            return <TH id="last_month">{t('table-heading-last-month')}</TH>
        } else {
            var props = {
                statistics: _.get(this.props.statistics, [ repo.id, 'last_month' ]),
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the number of stories this month
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderThisMonthColumn: function(repo) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!repo) {
            return <TH id="this_month">{t('table-heading-this-month')}</TH>
        } else {
            var props = {
                statistics: _.get(this.props.statistics, [ repo.id, 'this_month' ]),
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the number of stories to date
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderToDateColumn: function(repo) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!repo) {
            return <TH id="to_date">{t('table-heading-to-date')}</TH>
        } else {
            var props = {
                statistics: _.get(this.props.statistics, [ repo.id, 'to_date' ]),
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn: function(repo) {
        if (this.props.theme.isBelowMode('standard')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!repo) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            return <td><ModifiedTimeTooltip time={repo.mtime} /></td>;
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
});

var sortRepos = Memoize(function(repos, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return 'details.last_name';
            default:
                return column;
        }
    });
    return _.orderBy(repos, columns, directions);
});

var findServer = Memoize(function(servers, repo) {
    return _.find(servers, { id: repo.server_id });
});
