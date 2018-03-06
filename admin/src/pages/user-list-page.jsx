var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var ComponentRefs = require('utils/component-refs');
var ProjectFinder = require('objects/finders/project-finder');
var RoleFinder = require('objects/finders/role-finder');
var UserFinder = require('objects/finders/user-finder');
var UserTypes = require('objects/types/user-types');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var ComboButton = require('widgets/combo-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var ProfileImage = require('widgets/profile-image');
var ProjectTooltip = require('tooltips/project-tooltip');
var RoleTooltip = require('tooltips/role-tooltip');
var ModifiedTimeTooltip = require('tooltips/modified-time-tooltip')
var ActionBadge = require('widgets/action-badge');
var ActionConfirmation = require('widgets/action-confirmation');
var DataLossWarning = require('widgets/data-loss-warning');

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
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/users/?'
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
            var path = `/users/`, query, hash;
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
        // don't wait for remote data unless the route changes
        var freshRoute = (meanwhile.prior.props.route !== this.props.route);
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', blocking: freshRoute, by: this });
        var props = {
            users: null,
            projects: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<UserListPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            return UserFinder.findAllUsers(db).then((users) => {
                props.users = users;
            });
        }).then(() => {
            meanwhile.show(<UserListPageSync {...props} />);
            return ProjectFinder.findProjectsWithMembers(db, props.users).then((projects) => {
                props.projects = projects;
            });
        }).then(() => {
            meanwhile.show(<UserListPageSync {...props} />);
            return RoleFinder.findRolesOfUsers(db, props.users).then((roles) => {
                props.roles = roles;
            });
        }).then((roles) => {
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
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        return {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
            restoringUserIds: [],
            disablingUserIds: [],
            hasChanges: false,
            renderingFullList: this.isEditing(),
        };
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
        var params = { edit };
        return route.replace(module.exports, params);
    },

    /**
     * Return true if URL indicates user approval mode
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isEditing: function(props) {
        props = props || this.props;
        return props.route.parameters.edit;
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            if (this.isEditing(nextProps)) {
                this.setState({
                    renderingFullList: true,
                    restoringUserIds: [],
                    disablingUserIds: [],
                    hasChanges: false,
                });
            } else {
                // wait for animation to finish
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
            <div className="user-list-page">
                {this.renderButtons()}
                <h2>{t('user-list-title')}</h2>
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
                        {t('user-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('user-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            return (
                <div className="buttons">
                    <ComboButton>
                        <option name="add" separator onClick={this.handleAddClick}>
                            {t('user-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
                        {t('user-list-edit')}
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
            tableProps.expanded = this.isEditing();
            tableProps.expandable = true;
            tableProps.selectable = true;
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
                {this.renderNameColumn()}
                {this.renderTypeColumn()}
                {this.renderRolesColumn()}
                {this.renderProjectsColumn()}
                {this.renderEmailColumn()}
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
        var users = this.props.users;
        if (!this.state.renderingFullList) {
            users = filterUsers(users);
        }
        users = sortUsers(users,
            this.props.roles,
            this.props.projects,
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
        var onClick, title;
        if (user.deleted) {
            classes.push('deleted');
            title = t('user-list-status-deleted');
        } else if (user.disabled) {
            classes.push('disabled');
            title = t('user-list-status-disabled');
        }
        if (this.state.renderingFullList) {
            if (user.deleted || user.disabled) {
                if (_.includes(this.state.restoringUserIds, user.id)) {
                    classes.push('selected');
                }
            } else {
                classes.push('fixed');
                if (!_.includes(this.state.disablingUserIds, user.id)) {
                    classes.push('selected');
                }
            }
            onClick = this.handleRowClick;
        }
        var props = {
            className: classes.join(' '),
            'data-user-id': user.id,
            title,
            onClick,
        };
        return (
            <tr key={user.id} {...props}>
                {this.renderNameColumn(user)}
                {this.renderTypeColumn(user)}
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
        var p = this.props.locale.pick;
        if (!user) {
            return <TH id="name">{t('table-heading-name')}</TH>;
        } else {
            var name = p(user.details.name);
            var username = user.username;
            var url, badge;
            if (this.state.renderingFullList) {
                // add a badge next to the name if we're approving, restoring or
                // disabling a user
                var includedBefore, includedAfter;
                if (user.deleted || user.disabled) {
                    includedBefore = false;
                    includedAfter = _.includes(this.state.restoringUserIds, user.id);
                } else {
                    includedBefore = true;
                    includedAfter = !_.includes(this.state.disablingUserIds, user.id);
                }
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="reactivate" locale={this.props.locale} />;
                    } else {
                        badge = <ActionBadge type="disable" locale={this.props.locale} />;
                    }
                }
            } else {
                // don't create the link when we're editing the list
                var route = this.props.route;
                var params = { user: user.id }
                url = route.find(require('pages/user-summary-page'), params);
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
     * Render projects column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderProjectsColumn: function(user) {
        if (this.props.theme.isBelowMode('super-wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!user) {
            return <TH id="projects">{t('table-heading-projects')}</TH>;
        } else {
            var props = {
                projects: findProjects(this.props.projects, user),
                omit: 1,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
                disabled: this.state.renderingFullList,
            };
            return <td><ProjectTooltip {...props} /></td>;
        }
    },

    /**
     * Render roles column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
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
                route: this.props.route,
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
            if (email) {
                var url;
                if (!this.state.renderingFullList) {
                    url = `mailto:${email}`;
                }
                contents = <a href={url}>{email}</a>;
            }
            return <td className="email">{contents}</td>;
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
     * Called when user clicks new button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        var route = this.props.route;
        var params = { user: 'new' };
        return route.push(require('pages/user-summary-page'), params);
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
        var disabling = this.state.disablingUserIds;
        var restoring = this.state.restoringUserIds;
        var messages = [
            t('user-list-confirm-disable-$count', disabling.length),
            t('user-list-confirm-reactivate-$count', restoring.length),
        ];
        var bypass = [
            _.isEmpty(disabling) || undefined,
            _.isEmpty(restoring) || undefined,
        ];
        var confirmation = this.components.confirmation;
        return confirmation.askSeries(messages, bypass).then((confirmed) => {
            if (confirmed) {
                var db = this.props.database.use({ schema: 'global', by: this });
                return db.start().then((userId) => {
                    var usersAfter = [];
                    _.each(this.props.users, (user) => {
                        var flags = {};
                        if (_.includes(disabling, user.id)) {
                            flags.disabled = true;
                        } else if (_.includes(restoring, user.id)) {
                            flags.disabled = flags.deleted = false;
                        } else {
                            return;
                        }
                        var userAfter = _.assign({}, user, flags);
                        usersAfter.push(userAfter);
                    });
                    return db.save({ table: 'user' }, usersAfter).then((users) => {
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
        var userId = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        var user = _.find(this.props.users, { id: userId });
        var restoringUserIds = _.slice(this.state.restoringUserIds);
        var disablingUserIds = _.slice(this.state.disablingUserIds);
        if (user.deleted || user.disabled) {
            if (_.includes(restoringUserIds, user.id)) {
                _.pull(restoringUserIds, user.id);
            } else {
                restoringUserIds.push(user.id);
            }
        } else {
            if (_.includes(disablingUserIds, user.id)) {
                _.pull(disablingUserIds, user.id);
            } else {
                disablingUserIds.push(user.id);
            }
        }
        var hasChanges = !_.isEmpty(restoringUserIds) || !_.isEmpty(disablingUserIds);
        this.setState({ restoringUserIds, disablingUserIds, hasChanges });
    }
});

var sortUsers = Memoize(function(users, roles, projects, locale, columns, directions) {
    var p = locale.pick;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return (user) => {
                    return p(user.details.name);
                };
            case 'type':
                return (user) => {
                    return _.indexOf(UserTypes, user.type);
                };
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

var filterUsers = Memoize(function(users) {
    return _.filter(users, (user) => {
        return (user.disabled !== true) && (user.deleted !== true);
    });
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
