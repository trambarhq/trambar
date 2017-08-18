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

var ProjectSummaryPage = require('pages/project-summary-page');

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
        parseUrl: function(url) {
            return Route.match('/projects/', url);
        },

        getUrl: function(params) {
            return `/projects/`;
        },
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        var props = {
            projects: null,
            repos: null,
            users: null,
            statisticsc: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ProjectListPageSync {...props} />);
        return db.start().then((userId) => {
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
                project_ids: _.map(props.projects, 'id')
            };
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            meanwhile.show(<ProjectListPageSync {...props} />);
        }).then(() => {
            // load statistics of each project
            return Promise.each(props.projects, (project) => {
                return loadStatistics(db, project).then((projectStats) => {
                    props.statistics = _.decoupleSet(props.statistics, project.name, projectStats);
                });
            });
        }).then(() => {
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

    getInitialState: function() {
        return {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
        };
    },

    render: function() {
        var t = this.props.locale.translate;
        return (
            <div className="project-list-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('project-list-new')}
                </PushButton>
                <h2>{t('project-list-title')}</h2>
                {this.renderTable()}
            </div>
        );
    },

    renderTable: function() {
        var t = this.props.locale.translate;
        var tableProps = {
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        var projects = sortProjects(this.props.projects, this.props.users, this.props.repos, this.props.locale, this.state.sortColumns, this.state.sortDirections);
        return (
            <SortableTable {...tableProps}>
                <thead>
                    <tr>
                        {this.renderTitleColumn()}
                        {this.renderUserColumn()}
                        {this.renderRepositoriesColumn()}
                        {this.renderDateRangeColumn()}
                        {this.renderLastMonthColumn()}
                        {this.renderThisMonthColumn()}
                        {this.renderToDateColumn()}
                        {this.renderModifiedTimeColumn()}
                    </tr>
                </thead>
                <tbody>
                    {_.map(projects, this.renderRow)}
                </tbody>
            </SortableTable>
        );
    },

    renderRow: function(project, i) {
        return (
            <tr key={i}>
                {this.renderTitleColumn(project)}
                {this.renderUserColumn(project)}
                {this.renderRepositoriesColumn(project)}
                {this.renderDateRangeColumn(project)}
                {this.renderLastMonthColumn(project)}
                {this.renderThisMonthColumn(project)}
                {this.renderToDateColumn(project)}
                {this.renderModifiedTimeColumn(project)}
            </tr>
        );
    },

    renderTitleColumn: function(project) {
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="title">{t('table-heading-name')}</TH>;
        } else {
            var p = this.props.locale.pick;
            var title = p(project.details.title);
            if (title) {
                title = t('project-list-$title-with-$name', title, project.name);
            } else {
                title = _.capitalize(project.name);
            }
            var url = ProjectSummaryPage.getUrl({ projectId: project.id });
            return <td><a href={url}>{title}</a></td>;
        }
    },

    renderUserColumn: function(project) {
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

    renderDateRangeColumn: function(project) {
        if (this.props.theme.isBelowMode('wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="range">{t('table-heading-date-range')}</TH>
        } else {
            var start, end;
            var dateRange = _.get(this.props.statistics, [ project.name, 'dateRange' ]);
            if (dateRange) {
                start = Moment(dateRange.details.start_time).format('ll');
                end = Moment(dateRange.details.end_time).format('ll');
            }
            return <td>{t('date-range-$start-$end', start, end)}</td>;
        }
    },

    renderLastMonthColumn: function(project) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="last_month">{t('table-heading-last-month')}</TH>
        } else {
            var dailyActivities = _.get(this.props.statistics, [ project.name, 'dailyActivities' ]);
            var month = Moment().subtract(1, 'month').format('YYYY-MM');
            var statistics = summarizeStatistics(dailyActivities, month);
            if (statistics.total === 0) {
                // see if the project was created this month
                var created = Moment(project.ctime).format('YYYY-MM');
                if (created > month) {
                    statistics.total = undefined;
                }
            }
            var props = {
                statistics,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    renderThisMonthColumn: function(project) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="this_month">{t('table-heading-this-month')}</TH>
        } else {
            var dailyActivities = _.get(this.props.statistics, [ project.name, 'dailyActivities' ]);
            var month = Moment().format('YYYY-MM');
            var statistics = summarizeStatistics(dailyActivities, month);
            var props = {
                statistics,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    renderToDateColumn: function(project) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!project) {
            return <TH id="to_date">{t('table-heading-to-date')}</TH>
        } else {
            var dailyActivities = _.get(this.props.statistics, [ project.name, 'dailyActivities' ]);
            var statistics = summarizeStatistics(dailyActivities);
            var props = {
                statistics,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

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

    inMode: function(...modes) {
        return _.includes(modes, this.props.theme.mode);
    },

    handleSort: function(evt) {
        this.setState({
            sortColumns: evt.columns,
            sortDirections: evt.directions
        });
    },
});

var sortProjects = Memoize(function(projects, users, repos, locale, columns, directions) {
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
            default:
                return column;
        }
    });
    return _.orderBy(projects, columns, directions);
});

function loadStatistics(db, project) {
    var schema = project.name;
    // load project-date-range statistics
    var criteria = {
        type: 'project-date-range',
        filters: {},
    };
    return db.findOne({ schema, table: 'statistics', criteria }).then((dateRange) => {
        var statistics = { dateRange };

        // load daily-activities statistics
        var startTime = _.get(dateRange, 'details.start_time');
        var endTime = _.get(dateRange, 'details.end_time');
        if (startTime && endTime) {
            // get time range of each month (local time)
            var s = Moment(startTime).startOf('month');
            var e = Moment(endTime).endOf('month');
            var tzOffset = s.utcOffset();
            var timeRanges = [];
            for (var m = s.clone(); m.month() <= e.month(); m.add(1, 'month')) {
                var rangeStart = m.toISOString();
                var rangeEnd = m.clone().endOf('month').toISOString();
                var range = `[${rangeStart},${rangeEnd}]`;
                timeRanges.push(range);
            }
            var criteria = {
                type: 'daily-activities',
                filters: _.map(timeRanges, (timeRange) => {
                    return {
                        time_range: timeRange,
                        tz_offset: tzOffset,
                    };
                })
            };
            return db.find({ schema, table: 'statistics', criteria }).then((dailyActivities) => {
                statistics.dailyActivities = dailyActivities;
                return statistics;
            });
        } else {
            return statistics;
        }
    });
}

var summarizeStatistics = Memoize(function(dailyActivities, month) {
    var total = 0;
    var stats = { total: 0 };
    _.each(dailyActivities, (monthlyStats) => {
        _.each(monthlyStats.details, (dailyCounts, date) => {
            if (month && date.substr(0, 7) !== month) {
                return;
            }
            _.each(dailyCounts, (value, type) => {
                stats.total += value;
                if (stats[type]) {
                    stats[type] += value;
                } else {
                    stats[type] = value;
                }
            });
        });
    });
    return stats;
});

var findRepos = Memoize(function(repos, project) {
    return _.filter(repos, (repo) => {
        return _.includes(project.repo_ids, repo.id);
    });
});

var findUsers = Memoize(function(users, project) {
    return _.filter(users, (user) => {
        return _.includes(user.project_ids, project.id);
    });
});
