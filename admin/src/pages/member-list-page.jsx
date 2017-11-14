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
var ComboButton = require('widgets/combo-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var ProfileImage = require('widgets/profile-image');
var ActivityTooltip = require('tooltips/activity-tooltip');
var RoleTooltip = require('tooltips/role-tooltip');
var ActionBadge = require('widgets/action-badge');
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
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/projects/:project/members/?'
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
            var path = `/projects/${params.project}/members/`, query, hash;
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
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', by: this });
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
        return db.start().then((userId) => {
            // load project
            var criteria = { id: params.project };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load all users that weren't deleted
            var criteria = { deleted: false };
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
            removingUserIds: [],
            addingUserIds: [],
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

    componentWillReceiveProps: function(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            if (this.isEditing(nextProps)) {
                this.setState({
                    renderingFullList: true,
                    removingUserIds: [],
                    addingUserIds: [],
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
                <div key="edit" className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('member-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('member-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            var userIds = _.get(this.props.project, 'user_ids');
            var membersPending = _.some(this.props.users, (user) => {
                return !_.includes(userIds, user.id);
            });
            var preselected = (membersPending) ? 'approve' : undefined;
            return (
                <div key="view" className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="approve" disabled={!membersPending} onClick={this.handleApproveClick}>
                            {t('member-list-approve-all')}
                        </option>
                        <option name="reject" disabled={!membersPending} onClick={this.handleRejectClick}>
                            {t('member-list-reject-all')}
                        </option>
                        <option name="add" separator onClick={this.handleAddClick}>
                            {t('member-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
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
            // list all users when we're editing the list
            users = this.props.users;
        } else {
            // list only those who're in the project--or are trying to join
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
        var t = this.props.locale.translate;
        var classes = [];
        var title, onClick;
        var existing = _.includes(this.props.project.user_ids, user.id);
        var pending = _.includes(user.requested_project_ids, this.props.project.id);
        if (!existing) {
            if (pending) {
                classes.push('pending');
                title = t('member-list-status-pending');
            } else {
                classes.push('disabled');
                title = t('member-list-status-non-member');
            }
        }
        if (this.state.renderingFullList) {
            if (existing || pending) {
                classes.push('fixed');
            }
            if (existing) {
                if (!_.includes(this.state.removingUserIds, user.id)) {
                    classes.push('selected');
                }
            } else {
                if (_.includes(this.state.addingUserIds, user.id)) {
                    classes.push('selected');
                }
            }
            onClick = this.handleRowClick;
        }
        var props = {
            className: classes.join(' '),
            'data-user-id': user.id,
            onClick,
            title,
        };
        return (
            <tr key={user.id} {...props}>
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
            var url, badge;
            if (this.state.renderingFullList) {
                // compare against original list if the member will be added or removed
                var userIds = _.get(this.props.project, 'user_ids', []);
                var includedBefore = _.includes(userIds, user.id);
                var includedAfter;
                if (includedBefore) {
                    includedAfter = !_.includes(this.state.removingUserIds, user.id);
                } else {
                    includedAfter = _.includes(this.state.addingUserIds, user.id);
                }
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="add" locale={this.props.locale} />;
                    } else {
                        badge = <ActionBadge type="remove" locale={this.props.locale} />;
                    }
                }
            } else {
                // don't create the link when we're editing the list
                url = this.props.route.find(require('pages/user-summary-page'), {
                    user: user.id,
                    project: this.props.project.id,
                });
            }
            var image = <ProfileImage user={user} theme={this.props.theme} />;
            var text = t('user-list-$name-with-$username', name, username);
            return (
                <td>
                    <a href={url}>{image} {text}</a>{badge}
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
            return <td>{t(`user-list-type-${user.type}`)}</td>;
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
                disabled: this.state.renderingFullList,
                locale: this.props.locale,
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

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick: function(evt) {
        this.setEditability(true);
    },

    /**
     * Called when user clicks add button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.user = 'new';
        return route.push(require('pages/user-summary-page'), params);
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
     *
     * @return {Promise}
     */
    handleSaveClick: function(evt) {
        var db = this.props.database.use({ schema: 'global', by: this });
        return db.start().then((userId) => {
            var removing = this.state.removingUserIds;
            var adding = this.state.addingUserIds;
            var userIds = this.props.project.user_ids;
            var userIdsAfter = _.union(_.difference(userIds, removing), adding);
            var columns = {
                id: this.props.project.id,
                user_ids: userIdsAfter,
            };
            return db.saveOne({ table: 'project' }, columns).then((project) => {
                this.setState({ hasChanges: false }, () => {
                    return this.setEditability(false);
                });
            });
        });
    },

    /**
     * Called when user clicks on a row in edit mode
     *
     * @param  {Event} evt
     */
    handleRowClick: function(evt) {
        var userId = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        var userIds = this.props.project.user_ids;
        var addingUserIds = _.slice(this.state.addingUserIds);
        var removingUserIds = _.slice(this.state.removingUserIds);
        if (_.includes(userIds, userId)) {
            if (_.includes(removingUserIds, userId)) {
                _.pull(removingUserIds, userId);
            } else {
                removingUserIds.push(userId);
            }
        } else {
            if (_.includes(addingUserIds, userId)) {
                _.pull(addingUserIds, userId);
            } else {
                addingUserIds.push(userId);
            }
        }
        var hasChanges = !_.isEmpty(addingUserIds) || !_.isEmpty(removingUserIds);
        this.setState({ addingUserIds, removingUserIds, hasChanges });
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
