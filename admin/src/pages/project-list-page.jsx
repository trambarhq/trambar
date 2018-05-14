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
var ComponentRefs = require('utils/component-refs');
var ProjectFinder = require('objects/finders/project-finder');
var RepoFinder = require('objects/finders/repo-finder');
var UserFinder = require('objects/finders/user-finder');
var StatisticsFinder = require('objects/finders/statistics-finder');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var ComboButton = require('widgets/combo-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var UserTooltip = require('tooltips/user-tooltip');
var RepositoryTooltip = require('tooltips/repository-tooltip');
var ActivityTooltip = require('tooltips/activity-tooltip');
var ModifiedTimeTooltip = require('tooltips/modified-time-tooltip')
var ActionBadge = require('widgets/action-badge');
var ActionConfirmation = require('widgets/action-confirmation');
var DataLossWarning = require('widgets/data-loss-warning');

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
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/projects/?'
            ], (params) => {
                return {
                    edit: !!query.edit,
                };
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getURL: function(params) {
            var path = `/projects/`, query, hash;
            if (params && params.edit) {
                query = { edit: 1 };
            }
            return { path, query, hash };
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
        return db.start().then((userId) => {
            return ProjectFinder.findAllProjects(db).then((projects) => {
                props.projects = projects;
            });
        }).then((projects) => {
            meanwhile.show(<ProjectListPageSync {...props} />);
            return RepoFinder.findProjectRepos(db, props.projects).then((repos) => {
                props.repos = repos;
            });
        }).then(() => {
            return UserFinder.findProjectMembers(db, props.projects).then((users) => {
                props.users = users;
            });
        }).then(() => {
            return StatisticsFinder.findDailyActivitiesOfProjects(db, props.projects).then((statistics) => {
                props.statistics = statistics;
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
            restoringProjectIds: [],
            archivingProjectIds: [],
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
                    restoringProjectIds: [],
                    archivingProjectIds: [],
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
                        {t('project-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('project-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            var preselected;
            var empty = _.isEmpty(this.props.projects);
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="add" className="separated" onClick={this.handleAddClick}>
                            {t('project-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" disabled={empty} onClick={this.handleEditClick}>
                        {t('project-list-edit')}
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
            tableProps.onClick = this.handleRowClick;
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
        var projects = this.props.projects;
        if (!this.state.renderingFullList) {
            projects = filterProjects(projects);
        }
        projects = sortProjects(projects,
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
     *
     * @return {ReactElement}
     */
    renderRow: function(project) {
        var t = this.props.locale.translate;
        var classes = [];
        var onClick, title;
        if (project.deleted) {
            classes.push('deleted');
            title = t('project-list-status-deleted');
        } else if (project.archived) {
            classes.push('disabled');
            title = t('project-list-status-archived');
        }
        if (this.state.renderingFullList) {
            if (project.deleted || project.archived) {
                if (_.includes(this.state.restoringProjectIds, project.id)) {
                    classes.push('selected');
                }
            } else {
                classes.push('fixed');
                if (!_.includes(this.state.disablingProjectIds, project.id)) {
                    classes.push('selected');
                }
            }
            onClick = this.handleRowClick;
        }
        var props = {
            className: classes.join(' '),
            'data-project-id': project.id,
            title,
            onClick,
        };
        return (
            <tr key={project.id} {...props}>
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
            var title = p(project.details.title) || project.name;
            var url, badge;
            if (this.state.renderingFullList) {
                // add a badge next to the name if we're archiving or
                // restoring a project
                var includedBefore, includedAfter;
                if (project.deleted || project.archived) {
                    includedBefore = false;
                    includedAfter = _.includes(this.state.restoringProjectIds, project.id);
                } else {
                    includedBefore = true;
                    includedAfter = !_.includes(this.state.archivingProjectIds, project.id);
                }
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="restore" locale={this.props.locale} />;
                    } else {
                        badge = <ActionBadge type="archive" locale={this.props.locale} />;
                    }
                }
            } else {
                // link to project summary in non-editing mode
                var route = this.props.route;
                var params = { project: project.id };
                url = route.find(require('pages/project-summary-page'), params);
            }
            return (
                <td>
                    <a href={url}>{title}</a>{badge}
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
                route: this.props.route,
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
                route: this.props.route,
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
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        var lc = this.props.locale.localeCode;
        if (!project) {
            return <TH id="range">{t('table-heading-date-range')}</TH>
        } else {
            if (!project.deleted) {
                var start, end;
                var range = _.get(this.props.statistics, [ project.id, 'range' ]);
                if (range) {
                    start = Moment(range.start).locale(lc).format('ll');
                    end = Moment(range.end).locale(lc).format('ll');
                }
                return <td>{t('date-range-$start-$end', start, end)}</td>;
            } else {
                return <td>{t('project-list-deleted')}</td>;
            }
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
        if (this.props.theme.isBelowMode('super-wide')) {
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
        if (this.props.theme.isBelowMode('super-wide')) {
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
        if (this.props.theme.isBelowMode('super-wide')) {
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
            var props = {
                time: project.mtime,
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
     * Called when user clicks add button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        var route = this.props.route;
        return route.push(require('pages/project-summary-page'), {
            project: 'new'
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
        var archiving = this.state.archivingProjectIds;
        var restoring = this.state.restoringProjectIds;
        var messages = [
            t('project-list-confirm-archive-$count', archiving.length),
            t('project-list-confirm-restore-$count', restoring.length),
        ];
        var bypass = [
            _.isEmpty(archiving) || undefined,
            _.isEmpty(restoring) || undefined,
        ];
        var confirmation = this.components.confirmation;
        return confirmation.askSeries(messages, bypass).then((confirmed) => {
            if (confirmed) {
                var db = this.props.database.use({ schema: 'global', by: this });
                return db.start().then((userId) => {
                    var projectsAfter = [];
                    _.each(this.props.projects, (project) => {
                        var flags = {};
                        if (_.includes(archiving, project.id)) {
                            flags.archived = true;
                        } else if (_.includes(restoring, project.id)) {
                            flags.archived = flags.deleted = false;
                        } else {
                            return;
                        }
                        var projectAfter = _.assign({}, project, flags);
                        projectsAfter.push(projectAfter);
                    });
                    return db.save({ table: 'project' }, projectsAfter).then((projects) => {
                        this.setState({ hasChanges: false }, () => {
                            this.setEditability(false);
                        });
                        return null;
                    });
                });
            }
        });
    },

    /**
     * Called when user clicks a row in edit mode
     *
     * @param  {Event} evt
     */
    handleRowClick: function(evt) {
        var projectId = parseInt(evt.currentTarget.getAttribute('data-project-id'));
        var project = _.find(this.props.projects, { id: projectId });
        var restoringProjectIds = _.slice(this.state.restoringProjectIds);
        var archivingProjectIds = _.slice(this.state.archivingProjectIds);
        if (project.deleted || project.archived) {
            if (_.includes(restoringProjectIds, project.id)) {
                _.pull(restoringProjectIds, project.id);
            } else {
                restoringProjectIds.push(project.id);
            }
        } else {
            if (_.includes(archivingProjectIds, project.id)) {
                _.pull(archivingProjectIds, project.id);
            } else {
                archivingProjectIds.push(project.id);
            }
        }
        var hasChanges = !_.isEmpty(restoringProjectIds) || !_.isEmpty(archivingProjectIds);
        this.setState({ restoringProjectIds, archivingProjectIds, hasChanges });
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

var filterProjects = Memoize(function(projects) {
    return _.filter(projects, (project) => {
        return !project.deleted && !project.archived;
    });
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
