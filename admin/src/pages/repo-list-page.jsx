var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var ComponentRefs = require('utils/component-refs');
var HttpError = require('errors/http-error');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var DailyActivities = require('data/daily-activities');

// widgets
var PushButton = require('widgets/push-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var ActivityTooltip = require('tooltips/activity-tooltip');
var ModifiedTimeTooltip = require('tooltips/modified-time-tooltip')
var ActionBadge = require('widgets/action-badge');
var ActionConfirmation = require('widgets/action-confirmation');
var DataLossWarning = require('widgets/data-loss-warning');

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
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/projects/:project/repos/?'
            ], (params) => {
                params.project = parseInt(params.project);
                params.edit = !!query.edit;
                return params;
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getUrl: function(params) {
            var path = `/projects/${params.project}/repos/`, query, hash;
            if (params.edit) {
                query = { edit: 1 };
            }
            return { path, query, hash };
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     * @param  {Object} prevProps
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile, prevProps) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', by: this });
        var delay = (this.props.route !== prevProps.route) ? 100 : 1000;
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
        meanwhile.show(<RepoListPageSync {...props} />, delay);
        return db.start().then((userId) => {
            // load project
            var criteria = { id: params.project };
            return db.findOne({ table: 'project', criteria, required: true });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load all repos
            var criteria = {};
            return db.find({ table: 'repo', criteria });
        }).then((repos) => {
            props.repos = repos;
            return meanwhile.show(<RepoListPageSync {...props} />);
        }).then(() => {
            // load servers
            var criteria = {
                id: _.map(props.repos, 'server_id')
            };
            return db.find({ table: 'server', criteria });
        }).then((servers) => {
            props.servers = servers;
            return meanwhile.show(<RepoListPageSync {...props} />);
        }).then(() => {
            // load user statistics of the project's repo
            var repos = findRepos(props.repos, props.project);
            return DailyActivities.loadRepoStatistics(db, props.project, repos);
        }).then((statistics) => {
            props.statistics = statistics;
            return <RepoListPageSync {...props} />;
        }).catch(HttpError, (error) => {
            this.props.route.replace(require('pages/error-page'), { error });
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
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        return {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
            selectedRepoIds: [],
            hasChanges: false,
            renderingFullList: this.isEditing(),
        };
    },

    /**
     * Return true when the URL indicate edit mode
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isEditing: function(props) {
        props = props || this.props;
        return props.route.parameters.edit;
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     *
     * @return {Promise}
     */
    setEditability: function(edit) {
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.edit = edit;
        return this.props.route.replace(module.exports, params);
    },

    /**
     * Check if we're switching into edit mode
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            if (this.isEditing(nextProps)) {
                // initial list of ids to the current list
                this.setState({
                    renderingFullList: true,
                    selectedRepoIds: _.get(nextProps.project, 'repo_ids', []),
                    hasChanges: false,
                });
            } else {
                setTimeout(() => {
                    if (!this.isEditing()) {
                        this.setState({ renderingFullList: false });
                    }
                }, 500);
            }
        }
        if (this.props.project !== nextProps.project && nextProps.project) {
            var selectedRepoIds = this.state.selectedRepoIds;
            var originalRepoIds = _.get(this.props.project, 'repo_ids', []);
            var incomingRepoIds = _.get(nextProps.project, 'repo_ids', []);
            if (selectedRepoIds === originalRepoIds) {
                // use the list from the incoming object if no change has been made yet
                selectedRepoIds = incomingRepoIds;
            } else {
                if (!_.isEqual(originalRepoIds, incomingRepoIds)) {
                    // merge the list when a change has been made (by someone else presumably)
                    selectedRepoIds = _.union(selectedRepoIds, incomingRepoIds);
                }
            }
            this.setState({ selectedRepoIds });
        }
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
                {this.renderButtons()}
                <h2>{t('repo-list-title')}</h2>
                {this.renderTable()}
                <ActionConfirmation ref={this.components.setters.confirmation} locale={this.props.locale} theme={this.props.theme} />
                <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
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
        if (this.isEditing()) {
            return (
                <div className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('repo-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('repo-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            return (
                <div className="buttons">
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
                        {t('repo-list-edit')}
                    </PushButton>
                </div>
            );
        }
    },

    /**
     * Render a table
     *
     * @return {ReactElement}
     */
    renderTable: function() {
        var tableProps = {
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        if (this.state.renderingFullList) {
            tableProps.expandable = true;
            tableProps.selectable = true;
            tableProps.expanded = this.isEditing();
        }
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
                {this.renderServerColumn()}
                {this.renderIssueTrackerColumn()}
                {this.renderDateRangeColumn()}
                {this.renderLastMonthColumn()}
                {this.renderThisMonthColumn()}
                {this.renderToDateColumn()}
                {this.renderModifiedTimeColumn()}
            </tr>
        );
    },

    /**
     * Render rows
     *
     * @return {Array<ReactElement>}
     */
    renderRows: function() {
        var repos = this.props.repos;
        if (!this.state.renderingFullList) {
            repos = findRepos(repos, this.props.project);
        }
        repos = sortRepos(
            repos,
            this.props.servers,
            this.props.statistics,
            this.props.locale,
            this.state.sortColumns,
            this.state.sortDirections
        );
        return _.map(repos, this.renderRow);
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
        var props = {};
        if (this.state.renderingFullList) {
            var originalRepoIds = _.get(this.props.project, 'repo_ids', []);
            if (_.includes(originalRepoIds, repo.id)) {
                props.className = 'fixed';
            }
            if (_.includes(this.state.selectedRepoIds, repo.id)) {
                props.className += ' selected';
            }
            props.onClick = this.handleRowClick;
            props['data-repo-id'] = repo.id;
        }
        return (
            <tr key={repo.id} {...props}>
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
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            var p = this.props.locale.pick;
            var title = p(repo.details.title) || repo.name;
            var url;
            var badge;
            if (this.state.renderingFullList) {
                // compare against original project object to see if the repo
                // will be added or removed
                var originalRepoIds = _.get(this.props.project, 'repo_ids', []);
                var includedBefore = _.includes(originalRepoIds, repo.id);
                var includedAfter = _.includes(this.state.selectedRepoIds, repo.id);
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="add" locale={this.props.locale} />;
                    } else {
                        badge = <ActionBadge type="remove" locale={this.props.locale} />;
                    }
                }
            } else {
                // don't create the link when we're editing the list
                var route = this.props.route;
                var params = _.clone(route.parameters);
                params.repo = repo.id;
                url = route.find(require('pages/repo-summary-page'), params);
            }
            return (
                <td>
                    <a href={url}>{title}</a>{badge}
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
            return <TH id="server">{t('table-heading-server')}</TH>
        } else {
            var p = this.props.locale.pick;
            var server = findServer(this.props.servers, repo);
            var contents;
            if (server) {
                var title = p(server.details.title) || t(`server-type-${server.type}`);
                var route = this.props.route;
                var params = { server: server.id };
                var url = route.find(require('pages/server-summary-page'), params);
                contents =(
                    <a href={url}>
                        <i className={`fa fa-${server.type} fa-fw`} />
                        {' '}
                        {title}
                    </a>
                );
            }
            return <td>{contents}</td>;
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
            return <TH id="issue_tracker">{t('table-heading-issue-tracker')}</TH>
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
            var props = {
                time: repo.mtime,
                locale: this.props.locale,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
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
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick: function(evt) {
        this.setEditability(true);
    },

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        this.setEditability(false);
    },

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick: function(evt) {
        var t = this.props.locale.translate;
        var originalRepoIds = _.get(this.props.project, 'repo_ids', []);
        var removing = _.difference(originalRepoIds, this.state.selectedRepoIds);
        var message = t('repo-list-confirm-remove-$count', removing.length);
        var confirmation = this.components.confirmation;
        return confirmation.ask(message, _.isEmpty(removing) || undefined).then((confirmed) => {
            if (!confirmed) {
                return;
            }
            var db = this.props.database.use({ schema: 'global', by: this });
            return db.start().then((userId) => {
                var project = {
                    id: this.props.project.id,
                    repo_ids: this.state.selectedRepoIds
                };
                return db.saveOne({ table: 'project' }, project).then((project) => {
                    this.setState({ hasChanges: false }, () => {
                        this.setEditability(false);
                    });
                });
            });
        });
    },

    /**
     * Called when user clicks a row in edit mode
     *
     * @param  {Event} evt
     */
    handleRowClick: function(evt) {
        var repoId = parseInt(evt.currentTarget.getAttribute('data-repo-id'));
        var repoIds = this.props.project.repo_ids;
        var selectedRepoIds = _.slice(this.state.selectedRepoIds);
        var hasChanges = true;
        if (_.includes(selectedRepoIds, repoId)) {
            _.pull(selectedRepoIds, repoId);
        } else {
            selectedRepoIds.push(repoId);
        }
        if (selectedRepoIds.length === repoIds.length) {
            // if the new list has the same element as the old, use the latter so
            // to avoid a mere change in order of the ids
            if (_.difference(selectedRepoIds, repoIds).length === 0) {
                selectedRepoIds = repoIds;
                hasChanges = false;
            }
        }
        this.setState({ selectedRepoIds, hasChanges });
    }
});

var sortRepos = Memoize(function(repos, servers, statistics, locale, columns, directions) {
    var t = locale.translate;
    var p = locale.pick;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (repo) => {
                    return p(repo.details.title) || repo.name;
                };
            case 'server':
                return (repo) => {
                    var server = findServer(servers, repo);
                    if (server)  {
                        return p(server.details.title) || t(`server-type-${server.type}`);
                    }
                    return '';
                };
            case 'issue_tracker':
                return 'details.issues_enabled';
            case 'range':
                return (repo) => {
                    return _.get(statistics, [ repo.id, 'range', 'start' ], '');
                };
            case 'last_month':
                return (repo) => {
                    return _.get(statistics, [ repo.id, 'last_month', 'total' ], 0);
                };
            case 'this_month':
                return (repo) => {
                    return _.get(statistics, [ repo.id, 'this_month', 'total' ], 0);
                };
            case 'to_date':
                return (repo) => {
                    return _.get(statistics, [ repo.id, 'to_date', 'total' ], 0);
                };
            default:
                return column;
        }
    });
    return _.orderBy(repos, columns, directions);
});

var findServer = Memoize(function(servers, repo) {
    if (repo) {
        return _.find(servers, { id: repo.server_id });
    } else {
        return null;
    }
});

var findRepos = Memoize(function(repos, project) {
    if (project) {
        var hash = _.keyBy(repos, 'id');
        return _.filter(_.map(project.repo_ids, (id) => {
            return hash[id];
        }));
    } else {
        return [];
    }
});
