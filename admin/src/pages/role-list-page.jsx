var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var ComponentRefs = require('utils/component-refs');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var ComboButton = require('widgets/combo-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var UserTooltip = require('tooltips/user-tooltip');
var ModifiedTimeTooltip = require('tooltips/modified-time-tooltip')
var ActionBadge = require('widgets/action-badge');
var ActionConfirmation = require('widgets/action-confirmation');
var DataLossWarning = require('widgets/data-loss-warning');

require('./role-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'RolesPage',
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
                '/roles/?',
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
         * @return {String}
         */
        getURL: function(params) {
            var path = `/roles/`, query, hash;
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
        // don't wait for remote data unless the route changes
        var freshRoute = (meanwhile.prior.props.route !== this.props.route);
        var db = this.props.database.use({ schema: 'global', blocking: freshRoute, by: this });
        var props = {
            roles: null,
            users: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RoleListPageSync {...props} />, 250);
        return db.start().then((userId) => {
            // load all roles
            var criteria = {};
            return db.find({ table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            return meanwhile.show(<RoleListPageSync {...props} />);
        }).then(() => {
            var criteria = {
                role_ids: _.flatten(_.map(props.roles, 'id')),
            };
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            return <RoleListPageSync {...props} />;
        });
    }
});

var RoleListPageSync = module.exports.Sync = React.createClass({
    displayName: 'RoleListPage.Sync',
    propTypes: {
        roles: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

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
            restoringRoleIds: [],
            disablingRoleIds: [],
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
                    restoringRoleIds: [],
                    disablingRoleIds: [],
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
            <div className="role-list-page">
                {this.renderButtons()}
                <h2>{t('role-list-title')}</h2>
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
                        {t('role-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('role-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            var preselected = 'add';
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="add" onClick={this.handleAddClick}>
                            {t('role-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
                        {t('role-list-edit')}
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
        var roles = this.props.roles;
        if (!this.state.renderingFullList) {
            roles = filterRoles(roles);
        }
        roles = sortRoles(roles,
            this.props.users,
            this.props.locale,
            this.state.sortColumns,
            this.state.sortDirections
        );
        return _.map(roles, this.renderRow);
    },

    /**
     * Render a table row
     *
     * @param  {Object} role
     *
     * @return {ReactElement}
     */
    renderRow: function(role) {
        var t = this.props.locale.translate;
        var classes = [];
        var onClick, title;
        if (role.deleted) {
            classes.push('deleted');
            title = t('role-list-status-deleted');
        } else if (role.disabled) {
            classes.push('disabled');
            title = t('role-list-status-disabled');
        }
        if (this.state.renderingFullList) {
            if (role.deleted || role.disabled) {
                if (_.includes(this.state.restoringRoleIds, role.id)) {
                    classes.push('selected');
                }
            } else {
                classes.push('fixed');
                if (!_.includes(this.state.disablingRoleIds, role.id)) {
                    classes.push('selected');
                }
            }
            onClick = this.handleRowClick;
        }
        var props = {
            className: classes.join(' '),
            'data-role-id': role.id,
            title,
            onClick,
        };
        return (
            <tr key={role.id} {...props}>
                {this.renderTitleColumn(role)}
                {this.renderUsersColumn(role)}
                {this.renderModifiedTimeColumn(role)}
            </tr>
        );
    },

    /**
     * Render title column, either the heading or a data cell
     *
     * @param  {Object|null} role
     *
     * @return {ReactElement}
     */
    renderTitleColumn: function(role) {
        var t = this.props.locale.translate;
        if (!role) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            var p = this.props.locale.pick;
            var title = p(role.details.title) || '-';
            var url, badge;
            if (this.state.renderingFullList) {
                // add a badge next to the name if we're disabling or
                // restoring a role
                var includedBefore, includedAfter;
                if (role.deleted || role.disabled) {
                    includedBefore = false;
                    includedAfter = _.includes(this.state.restoringRoleIds, role.id);
                } else {
                    includedBefore = true;
                    includedAfter = !_.includes(this.state.disablingRoleIds, role.id);
                }
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="reactivate" locale={this.props.locale} />;
                    } else {
                        badge = <ActionBadge type="disable" locale={this.props.locale} />;
                    }
                }
            } else {
                var route = this.props.route;
                var params = { role: role.id };
                url = route.find(require('pages/role-summary-page'), params);
            }
            return (
                <td>
                    <a href={url}>{title}</a> {badge}
                </td>
            );
        }
    },

    /**
     * Render users column, either the heading or a data cell
     *
     * @param  {Object|null} role
     *
     * @return {ReactElement|null}
     */
    renderUsersColumn: function(role) {
        if (this.props.theme.isBelowMode('narrow')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!role) {
            return <TH id="users">{t('table-heading-users')}</TH>;
        } else {
            var props = {
                users: findUsers(this.props.users, role),
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><UserTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} role
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn: function(role) {
        if (this.props.theme.isBelowMode('standard')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!role) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            var props = {
                time: role.mtime,
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
     * Called when user click add button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        var route = this.props.route;
        var params = { role: 'new' };
        return route.push(require('pages/role-summary-page'), params);
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
        var disabling = this.state.disablingRoleIds;
        var restoring = this.state.restoringRoleIds;
        var messages = [
            t('role-list-confirm-disable-$count', disabling.length),
            t('role-list-confirm-reactivate-$count', restoring.length),
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
                    var rolesAfter = [];
                    _.each(this.props.roles, (role) => {
                        var flags = {};
                        if (_.includes(disabling, role.id)) {
                            flags.disabled = true;
                        } else if (_.includes(restoring, role.id)) {
                            flags.disabled = flags.deleted = false;
                        } else {
                            return;
                        }
                        var roleAfter = _.assign({}, role, flags);
                        rolesAfter.push(roleAfter);
                    });
                    return db.save({ table: 'role' }, rolesAfter).then((roles) => {
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
        var roleId = parseInt(evt.currentTarget.getAttribute('data-role-id'));
        var role = _.find(this.props.roles, { id: roleId });
        var restoringRoleIds = _.slice(this.state.restoringRoleIds);
        var disablingRoleIds = _.slice(this.state.disablingRoleIds);
        if (role.deleted || role.disabled) {
            if (_.includes(restoringRoleIds, role.id)) {
                _.pull(restoringRoleIds, role.id);
            } else {
                restoringRoleIds.push(role.id);
            }
        } else {
            if (_.includes(disablingRoleIds, role.id)) {
                _.pull(disablingRoleIds, role.id);
            } else {
                disablingRoleIds.push(role.id);
            }
        }
        var hasChanges = !_.isEmpty(restoringRoleIds) || !_.isEmpty(disablingRoleIds);
        this.setState({ restoringRoleIds, disablingRoleIds, hasChanges });
    },
});

var filterRoles = Memoize(function(roles) {
    return _.filter(roles, (role) => {
        return !role.deleted && !role.disabled;
    });
});

var sortRoles = Memoize(function(roles, users, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (role) => {
                    return locale.pick(role.details.title)
                };
            default:
                return column;
        }
    });
    return _.orderBy(roles, columns, directions);
});

var findUsers = Memoize(function(users, role) {
    return _.filter(users, (user) => {
        return _.includes(user.role_ids, role.id);
    })
});
