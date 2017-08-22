var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var UserSummaryPage = require('pages/user-summary-page');

// widgets
var PushButton = require('widgets/push-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var ProjectTooltip = require('widgets/project-tooltip');
var RoleTooltip = require('widgets/role-tooltip');
var ModifiedTimeTooltip = require('widgets/modified-time-tooltip')

require('./user-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'UserListPage',
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
            return Route.match('/users/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getUrl: function(params) {
            return `/users/`;
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
            users: null,
            projects: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<UserListPageSync {...props} />);
        return db.start().then((userId) => {
            // load all users
            var criteria = {};
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            meanwhile.show(<UserListPageSync {...props} />);
        }).then(() => {
            // load projects
            var criteria = {
                user_ids: _.map(props.users, 'id')
            };
            return db.find({ table: 'project', criteria });
        }).then((projects) => {
            props.projects = projects;
        }).then(() => {
            // load roles
            var criteria = {
                id: _.flatten(_.map(props.users, 'role_ids'))
            };
            return db.find({ table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            return <UserListPageSync {...props} />;
        });
    }
});

var UserListPageSync = module.exports.Sync = React.createClass({
    displayName: 'UserListPage.Sync',
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object),
        projects: PropTypes.arrayOf(PropTypes.object),
        roles: PropTypes.arrayOf(PropTypes.object),

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
            <div className="user-list-page">
                {this.renderButtons()}
                <h2>{t('user-list-title')}</h2>
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
                    {t('user-list-new')}
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
        var users = sortUsers(this.props.users, this.props.roles, this.props.projects, this.props.locale, this.state.sortColumns, this.state.sortDirections);
        return (
            <SortableTable {...tableProps}>
                <thead>
                    <tr>
                        {this.renderNameColumn()}
                        {this.renderRolesColumn()}
                        {this.renderProjectsColumn()}
                        {this.renderEmailColumn()}
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
                {this.renderProjectsColumn(user)}
                {this.renderEmailColumn(user)}
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
            var url = UserSummaryPage.getUrl({ userId: user.id });
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
     * Render projects column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderProjectsColumn: function(user) {
        if (this.props.theme.isBelowMode('ultra-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="projects">{t('table-heading-projects')}</TH>;
        } else {
            var props = {
                projects: findProjects(this.props.projects, user),
                omit: 1,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><ProjectTooltip {...props} /></td>;
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

var sortUsers = Memoize(function(users, roles, projects, locale, columns, directions) {
    var p = locale.pick;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return 'details.name';
            case 'roles':
                return (user) => {
                    var role0 = _.first(findRoles(roles, user));
                    if (!role0) {
                        return '';
                    }
                    return p(role0.details.title) || role0.name;
                };
            case 'projects':
                return (user) => {
                    var project0 = _.first(findProjects(projects, user));
                    if (!project0) {
                        return '';
                    }
                    return p(project0.details.title) || project0.name;
                };
            case 'email':
                return 'details.email';
            default:
                return column;
        }
    });
    return _.orderBy(users, columns, directions);
});

var findProjects = Memoize(function(projects, user) {
    return _.filter(projects, (project) => {
        return _.includes(project.user_ids, user.id);
    })
});

var findRoles = Memoize(function(roles, user) {
    var hash = _.keyBy(roles, 'id');
    return _.filter(_.map(user.role_ids, (id) => {
        return hash[id];
    }));
});
