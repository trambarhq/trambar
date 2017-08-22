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
         *
         * @return {String}
         */
        getUrl: function(params) {
            return `/projects/${params.projectId}/members/`;
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
        meanwhile.show(<MemberListPageSync {...props} />);
        return db.start().then((userId) => {
            // load project
            var criteria = {
                id: this.props.route.parameters.projectId
            };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load members
            var criteria = {
                id: props.project.user_ids
            };
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            meanwhile.show(<MemberListPageSync {...props} />);
        }).then(() => {
            // load roles
            var criteria = {
                id: _.flatten(_.map(props.users, 'role_ids'))
            };
            return db.find({ table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            meanwhile.show(<MemberListPageSync {...props} />);
        }).then(() => {
            // load user statistics
            return DailyActivities.loadUserStatistics(db, props.project, props.users);
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
        return (
            <div className="buttons">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('member-list-edit')}
                </PushButton>
                {' '}
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('member-list-new')}
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
            className: 'users',
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        var users = sortUsers(this.props.users, this.props.projects, this.props.locale, this.state.sortColumns, this.state.sortDirections);
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
                <tbody>
                    {_.map(users, this.renderRow)}
                </tbody>
            </SortableTable>
        );
    },

    /**
     * Render a table row
     *
     * @param  {Object} user
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderRow: function(user, i) {
        return (
            <tr key={i}>
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
            var url = require('pages/user-summary-page').getUrl({ userId: user.id });
            var resources = _.get(user, 'details.resources');
            var profileImage = _.find(resources, { type: 'image' });
            var imageUrl = this.props.theme.getImageUrl(profileImage, 24, 24);
            return (
                <td>
                    <a href={url}>
                        <img className="profile-image" src={imageUrl} />
                        {' '}
                        {t('user-list-$name-with-$username', name, username)}
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
            var contents;
            var email = user.details.email;
            if (email) {
                contents = <a href={`mailto:${email}`}>{email}</a>;
            } else {
                contents = '-';
            }
            return <td>{contents}</td>;
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
});

var sortUsers = Memoize(function(users, projects, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return 'details.name';
            case 'range':
                return (user) => {
                    return _.get(this.props.statistics, [ user.id, 'range', 'start' ], '');
                };
            case 'last_month':
                return (user) => {
                    return _.get(this.props.statistics, [ user.id, 'last_month', 'total' ], 0);
                };
            case 'this_month':
                return (user) => {
                    return _.get(this.props.statistics, [ user.id, 'this_month', 'total' ], 0);
                };
            case 'to_date':
                return (user) => {
                    return _.get(this.props.statistics, [ user.id, 'to_date', 'total' ], 0);
                };
            default:
                return column;
        }
    });
    return _.orderBy(users, columns, directions);
});

var findRoles = Memoize(function(roles, user) {
    var hash = _.keyBy(roles, 'id');
    return _.filter(_.map(user.role_ids, (id) => {
        return hash[id];
    }));
});
