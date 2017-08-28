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
var ActivityTooltip = require('tooltips/activity-tooltip');
var RoleTooltip = require('tooltips/role-tooltip');
var ModifiedTimeTooltip = require('tooltips/modified-time-tooltip')
var DataLossWarning = require('widgets/data-loss-warning');

require('./member-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'MemberListPage',
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
            return Route.match('/projects/:projectId/members/', url);
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
            var url = `/projects/${params.projectId}/members/`;
            if (query && query.edit) {
                url += '?edit=1';
            }
            return url;
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
            users: null,
            roles: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<MemberListPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            // load project
            var criteria = {
                id: parseInt(this.props.route.parameters.projectId)
            };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load all approved users
            var criteria = {
                approved: true
            };
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            meanwhile.show(<MemberListPageSync {...props} />);
        }).then(() => {
            // load roles
            var criteria = {
                id: _.uniq(_.flatten(_.map(props.users, 'role_ids')))
            };
            return db.find({ table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            meanwhile.show(<MemberListPageSync {...props} />);
        }).then(() => {
            // load statistics of members
            var users = findUsers(props.users, props.project)
            return DailyActivities.loadUserStatistics(db, props.project, users);
        }).then((statistics) => {
            props.statistics = statistics;
            return <MemberListPageSync {...props} />;
        });
    }
});

var MemberListPageSync = module.exports.Sync = React.createClass({
    displayName: 'MemberListPage.Sync',
    propTypes: {
        project: PropTypes.object,
        users: PropTypes.arrayOf(PropTypes.object),
        roles: PropTypes.arrayOf(PropTypes.object),
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
            selectedUserIds: [],
            hasChanges: false,
            renderingFullList: this.isEditing(),
        };
    },

    /**
     * Return project id specified in URL
     *
     * @return {Number}
     */
    getProjectId: function() {
        return parseInt(this.props.route.parameters.projectId);
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
        return !!parseInt(props.route.query.edit);
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     *
     * @return {Promise}
     */
    setEditability: function(edit) {
        var projectId = this.getProjectId();
        var url = require('pages/member-list-page').getUrl({ projectId }, { edit });
        return this.props.route.change(url, true);
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            if (this.isEditing(nextProps)) {
                var users = findUsers(nextProps.users, nextProps.project);
                var userIds = _.map(users, 'id');
                this.setState({
                    renderingFullList: true,
                    selectedUserIds: userIds,
                    changes: false,
                });
            } else {
                setTimeout(() => {
                    if (!this.isEditing()) {
                        this.setState({ renderingFullList: false });
                    }
                }, 500);
            }
        }
        if (this.props.project !== nextProps.project || this.props.users !== nextProps.users) {
            var users = findUsers(nextProps.users, nextProps.project);
            var userIds = _.map(users, 'id');
            var selectedUserIds = _.union(this.state.selectedUserIds, userIds);
            this.setState({ selectedUserIds });
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
            <div className="member-list-page">
                {this.renderButtons()}
                <h2>{t('member-list-title')}</h2>
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
        if (this.isEditing()) {
            // this.state.hasChanges can be false even when there're users that
            // could be added due to pre-selection
            var hasChanges = (this.props.project)
                           ? !_.isEqual(this.state.selectedUserIds, this.props.project.user_ids)
                           : false;
            return (
                <div key="edit" className="buttons">
                    <PushButton className="cancel" onClick={this.handleCancelClick}>
                        {t('member-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('member-list-save')}
                    </PushButton>
                    <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
                </div>
            );
        } else {
            return (
                <div key="view" className="buttons">
                    <PushButton className="add" onClick={this.handleAddClick}>
                        {t('member-list-new')}
                    </PushButton>
                    {' '}
                    <PushButton className="edit" onClick={this.handleEditClick}>
                        {t('member-list-edit')}
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
        var t = this.props.locale.translate;
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
                <tbody ref="tbody">
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
                {this.renderNameColumn()}
                {this.renderTypeColumn()}
                {this.renderRolesColumn()}
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
     * @type {Array<ReactElement>}
     */
    renderRows: function() {
        var users;
        if (this.state.renderingFullList) {
            // list all approved users when we're editing the list
            users = this.props.users;
        } else {
            // list only those we're in the project--or are trying to join
            users = findUsers(this.props.users, this.props.project);
        }
        var users = sortUsers(
            users,
            this.props.roles,
            this.props.statistics,
            this.props.locale,
            this.state.sortColumns,
            this.state.sortDirections
        );
        return _.map(users, this.renderRow);
    },

    /**
     * Render a table row
     *
     * @param  {Object} user
     *
     * @return {ReactElement}
     */
    renderRow: function(user) {
        var props = {
            key: user.id,
        };
        if (this.state.renderingFullList) {
            if (_.includes(this.props.project.user_ids, user.id)
             || _.includes(user.requested_project_ids, this.props.project.id)) {
                props.className = 'fixed';
            }
            if (_.includes(this.state.selectedUserIds, user.id)) {
                if (props.className) {
                    props.className += ' selected';
                } else {
                    props.className = 'selected';
                }
            }
            props.onClick = this.handleRowClick;
            props['data-user-id'] = user.id;
        } else {
            if (_.includes(user.requested_project_ids, this.props.project.id)) {
                props.className = 'pending';
            }
        }
        return (
            <tr {...props}>
                {this.renderNameColumn(user)}
                {this.renderTypeColumn(user)}
                {this.renderRolesColumn(user)}
                {this.renderDateRangeColumn(user)}
                {this.renderLastMonthColumn(user)}
                {this.renderThisMonthColumn(user)}
                {this.renderToDateColumn(user)}
                {this.renderModifiedTimeColumn(user)}
            </tr>
        );
    },

    /**
     * Render name column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderNameColumn: function(user) {
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="name">{t('table-heading-name')}</TH>;
        } else {
            var name = user.details.name;
            var username = user.username;
            var resources = _.get(user, 'details.resources');
            var profileImage = _.find(resources, { type: 'image' });
            var imageUrl = this.props.theme.getImageUrl(profileImage, 24, 24);
            var url;
            var badge;
            if (this.state.renderingFullList) {
                // compare against original project object to see if the user
                // will be added or removed
                var includedBefore = _.includes(this.props.project.user_ids, user.id);
                var includedAfter = _.includes(this.state.selectedUserIds, user.id);
                if (includedBefore && !includedAfter) {
                    badge = <i className="fa fa-user-times badge remove" />;
                } else if (!includedBefore && includedAfter) {
                    badge = <i className="fa fa-user-plus badge add" />;
                }
            } else {
                if (_.includes(user.requested_project_ids, this.props.project.id)) {
                    badge = <i className="fa fa-user-plus badge add" />;
                }
                // don't create the link when we're editing the list
                url = require('pages/user-summary-page').getUrl({
                    userId: user.id,
                    projectId: this.props.project.id,
                });
            }
            return (
                <td>
                    <a href={url}>
                        <img className="profile-image" src={imageUrl} />
                        {' '}
                        {t('user-list-$name-with-$username', name, username)}
                        {badge}
                    </a>
                </td>
            );
        }
    },

    /**
     * Render Type column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderTypeColumn: function(user) {
        if (this.props.theme.isBelowMode('narrow')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="type">{t('table-heading-type')}</TH>;
        } else {
            return <td>{t('user-list-user-$type-$approved', user.type, user.approved)}</td>;
        }
    },

    /**
     * Render roles column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderRolesColumn: function(user) {
        if (this.props.theme.isBelowMode('standard')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="roles">{t('table-heading-roles')}</TH>;
        } else {
            var props = {
                roles: findRoles(this.props.roles, user),
                locale: this.props.locale,
                theme: this.props.theme,
                disabled: this.state.renderingFullList,
            };
            return <td><RoleTooltip {...props} /></td>;
        }
    },

    /**
     * Render email column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderEmailColumn: function(user) {
        if (this.props.theme.isBelowMode('wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="email">{t('table-heading-email')}</TH>;
        } else {
            var contents = '-';
            var email = user.details.email;
            var url;
            if (!this.state.renderingFullList && email) {
                url = `mailto:${email}`;
            }
            return <td><a href={url}>{email}</a></td>;
        }
    },

    /**
     * Render active period column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderDateRangeColumn: function(user, editing) {
        if (this.props.theme.isBelowMode('wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="range">{t('table-heading-date-range')}</TH>
        } else {
            var start, end;
            var range = _.get(this.props.statistics, [ user.id, 'range' ]);
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
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderLastMonthColumn: function(user) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="last_month">{t('table-heading-last-month')}</TH>
        } else {
            var props = {
                statistics: _.get(this.props.statistics, [ user.id, 'last_month' ]),
                locale: this.props.locale,
                theme: this.props.theme,
                disabled: this.state.renderingFullList,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the number of stories this month
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderThisMonthColumn: function(user) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="this_month">{t('table-heading-this-month')}</TH>
        } else {
            var props = {
                statistics: _.get(this.props.statistics, [ user.id, 'this_month' ]),
                locale: this.props.locale,
                theme: this.props.theme,
                disabled: this.state.renderingFullList,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the number of stories to date
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderToDateColumn: function(user) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="to_date">{t('table-heading-to-date')}</TH>
        } else {
            var props = {
                statistics: _.get(this.props.statistics, [ user.id, 'to_date' ]),
                locale: this.props.locale,
                theme: this.props.theme,
                disabled: this.state.renderingFullList,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn: function(user) {
        if (this.props.theme.isBelowMode('standard')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            var props = {
                time: user.mtime,
                disabled: this.state.renderingFullList
            }
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

    handleEditClick: function(evt) {
        this.setEditability(true);
    },

    handleCancelClick: function(evt) {
        this.setEditability(false);
    },

    handleSaveClick: function() {
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        return db.start().then((currentUserId) => {
            var columns = {
                id: this.props.project.id,
                user_ids: this.state.selectedUserIds
            };
            return db.saveOne({ table: 'project' }, columns).then((project) => {
                return this.setEditability(false);
            });
        });
    },

    handleAddClick: function(evt) {
        var projectId = this.getProjectId();
        var url = require('pages/user-summary-page').getUrl({ projectId, userId: 'new' });
        this.props.route.change(url);
    },

    handleRowClick: function(evt) {
        var userId = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        var userIds = this.props.project.user_ids;
        var selectedUserIds = _.slice(this.state.selectedUserIds);
        var hasChanges = true;
        if (_.includes(selectedUserIds, userId)) {
            _.pull(selectedUserIds, userId);
        } else {
            selectedUserIds.push(userId);
        }
        if (selectedUserIds.length === userIds.length) {
            // if the new list has the same element as the old, use the latter so
            // to avoid a mere change in order of the ids
            if (_.difference(selectedUserIds, userIds).length === 0) {
                selectedUserIds = userIds;
                hasChanges = false;
            }
        }
        this.setState({ selectedUserIds, hasChanges });
    }
});

var sortUsers = Memoize(function(users, roles, statistics, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return 'details.name';
            case 'range':
                return (user) => {
                    return _.get(statistics, [ user.id, 'range', 'start' ], '');
                };
            case 'last_month':
                return (user) => {
                    return _.get(statistics, [ user.id, 'last_month', 'total' ], 0);
                };
            case 'this_month':
                return (user) => {
                    return _.get(statistics, [ user.id, 'this_month', 'total' ], 0);
                };
            case 'to_date':
                return (user) => {
                    return _.get(statistics, [ user.id, 'to_date', 'total' ], 0);
                };
            default:
                return column;
        }
    });
    return _.orderBy(users, columns, directions);
});

var findUsers = Memoize(function(users, project) {
    if (project) {
        var hash = _.keyBy(users, 'id');
        var existingUsers = _.filter(_.map(project.user_ids, (id) => {
            return hash[id];
        }));
        var pendingUsers = _.filter(users, (user) => {
            return _.includes(user.requested_project_ids, project.id);
        });
        return _.concat(existingUsers, pendingUsers);
    } else {
        return [];
    }
});

var findRoles = Memoize(function(roles, user) {
    var hash = _.keyBy(roles, 'id');
    return _.filter(_.map(user.role_ids, (id) => {
        return hash[id];
    }));
});
