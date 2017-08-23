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
var RoleTooltip = require('widgets/role-tooltip');
var ModifiedTimeTooltip = require('widgets/modified-time-tooltip')

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
         * @param  {Object} query
         *
         * @return {Object|null}
         */
        parseUrl: function(url, query) {
            var params = Route.match('/projects/:projectId/members/', url);
            if (params) {
                params.edit = !!parseInt(query.edit);
                return params;
            }
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getUrl: function(params) {
            var url = `/projects/${params.projectId}/members/`;
            if (params.edit) {
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
        return db.start().then((userId) => {
            // load project
            var criteria = {
                id: this.props.route.parameters.projectId
            };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load all users
            var criteria = {};
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
            renderingFullList: this.props.route.parameters.edit,
        };
    },

    /**
     * Return true when the URL indicate edit mode
     *
     * @return {Boolean}
     */
    isEditing: function() {
        return this.props.route.parameters.edit;
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.route !== nextProps.route) {
            if (nextProps.route.parameters.edit) {
                this.setState({ renderingFullList: true });
            } else {
                setTimeout(() => {
                    if (!this.props.route.parameters.edit && this.state.renderingFullList) {
                        this.setState({ renderingFullList: false });
                    }
                }, 500);
            }
        }
        if (this.props.project !== nextProps.project) {
            var selectedUserIds = this.state.selectedUserIds;
            if (!this.props.project || selectedUserIds === this.props.project.user_ids) {
                // use the list from the incoming object if no change has been made yet
                selectedUserIds = nextProps.project.user_ids;
            } else {
                if (!_.isEqual(this.props.project.user_ids, nextProps.project.user_ids)) {
                    // merge the list when a change has been made (by someone else presumably)
                    selectedUserIds = _.union(selectedUserIds, nextProps.project.user_ids);
                }
            }
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
            var hasChanges = this.props.project && !_.isEqual(this.state.selectedUserIds, this.props.project.user_ids);
            return (
                <div key="edit" className="buttons">
                    <PushButton className="cancel" onClick={this.handleCancelClick}>
                        {t('member-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('member-list-save')}
                    </PushButton>
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
        var users;
        if (this.state.renderingFullList) {
            // list all users when we're editing the list
            users = this.props.users;
            tableProps.expandable = true;
            tableProps.selectable = true;
            tableProps.expanded = this.isEditing();
        } else {
            // list only those we're in the project
            users = findUsers(this.props.users, this.props.project);
        }
        var users = sortUsers(users, this.props.roles, this.props.statistics, this.props.locale, this.state.sortColumns, this.state.sortDirections);
        return (
            <SortableTable {...tableProps}>
                <thead>
                    <tr>
                        {this.renderNameColumn()}
                        {this.renderRolesColumn()}
                        {this.renderDateRangeColumn()}
                        {this.renderLastMonthColumn()}
                        {this.renderThisMonthColumn()}
                        {this.renderToDateColumn()}
                        {this.renderModifiedTimeColumn()}
                    </tr>
                </thead>
                <tbody ref="tbody">
                    {_.map(users, this.renderRow)}
                </tbody>
            </SortableTable>
        );
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
            if (_.includes(this.props.project.user_ids, user.id)) {
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
        }
        return (
            <tr {...props}>
                {this.renderNameColumn(user)}
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
     * Render roles column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderRolesColumn: function(user) {
        if (this.props.theme.isBelowMode('narrow')) {
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
            return <td><ModifiedTimeTooltip time={user.mtime} /></td>;
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
        var url = require('pages/member-list-page').getUrl({
            projectId: this.props.route.parameters.projectId,
            edit: 1
        });
        this.props.route.change(url, true);
    },

    handleCancelClick: function(evt) {
        var url = require('pages/member-list-page').getUrl({
            projectId: this.props.route.parameters.projectId,
        });
        this.props.route.change(url, true);
    },

    handleAddClick: function(evt) {

    },

    handleRowClick: function(evt) {
        var userId = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        var userIds = this.props.project.user_ids;
        var selectedUserIds = _.slice(this.state.selectedUserIds);
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
            }
        }
        this.setState({ selectedUserIds });
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
    var hash = _.keyBy(users, 'id');
    return _.filter(_.map(project.user_ids, (id) => {
        return hash[id];
    }));
});

var findRoles = Memoize(function(roles, user) {
    var hash = _.keyBy(roles, 'id');
    return _.filter(_.map(user.role_ids, (id) => {
        return hash[id];
    }));
});
