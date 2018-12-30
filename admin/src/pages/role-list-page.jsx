import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import * as RoleFinder from 'objects/finders/role-finder';
import * as UserFinder from 'objects/finders/user-finder';

// widgets
import PushButton from 'widgets/push-button';
import ComboButton from 'widgets/combo-button';
import SortableTable, { TH } from 'widgets/sortable-table';
import UserTooltip from 'tooltips/user-tooltip';
import ModifiedTimeTooltip from 'tooltips/modified-time-tooltip'
import ActionBadge from 'widgets/action-badge';
import ActionConfirmation from 'widgets/action-confirmation';
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';

import './role-list-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Role List page.
 *
 * @extends AsyncComponent
 */
class RoleListPage extends AsyncComponent {
    static displayName = 'RoleListPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env, editing } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            database,
            route,
            env,
            editing,
        };
        meanwhile.show(<RoleListPageSync {...props} />);
        let currentUserID = await db.start();
        props.roles = await RoleFinder.findAllRoles(db);
        meanwhile.show(<RoleListPageSync {...props} />);
        props.users = await UserFinder.findUsersWithRoles(db, props.roles);
        return <RoleListPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the Role List page.
 *
 * @extends PureComponent
 */
class RoleListPageSync extends PureComponent {
    static displayName = 'RoleListPageSync';

    constructor(props) {
        let { editing } = props;
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        this.state = {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
            restoringRoleIDs: [],
            disablingRoleIDs: [],
            hasChanges: false,
            renderingFullList: editing,
            problems: {},
        };
    }

    /**
     * Toggle rendering of full list when entering and exiting edit mode
     *
     * @param  {Object} props
     * @param  {Object} state
     *
     * @return {Object|null}
     */
    static getDerivedStateFromProps(props, state) {
        let { editing } = props;
        let { renderingFullList } = state;
        if (editing && !renderingFullList) {
            return {
                renderingFullList: true,
                restoringRoleIDs: [],
                disablingRoleIDs: [],
                hasChanges: false,
            };
        } else if (!editing && renderingFullList) {
            return {
                renderingFullList: false,
                problems: {},
            };
        }
        return null;
    }

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     *
     * @return {Promise}
     */
    setEditability(edit) {
        let { route } = this.props;
        let params = _.clone(route.params);
        params.editing = edit || undefined;
        return route.replace(route.name, params);
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { route, env } = this.props;
        let { hasChanges, problems } = this.state;
        let { setters } = this.components;
        let { t } = env.locale;
        return (
            <div className="role-list-page">
                {this.renderButtons()}
                <h2>{t('role-list-title')}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {this.renderTable()}
                <ActionConfirmation ref={setters.confirmation} env={env} />
                <DataLossWarning changes={hasChanges} env={env} route={route} />
            </div>
        );
    }

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, roles, editing } = this.props;
        let { hasChanges } = this.state;
        let { t } = env.locale;
        if (editing) {
            return (
                <div className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('role-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('role-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            let preselected = 'add';
            let empty = _.isEmpty(roles);
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="add" onClick={this.handleAddClick}>
                            {t('role-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" disabled={empty} onClick={this.handleEditClick}>
                        {t('role-list-edit')}
                    </PushButton>
                </div>
            );
        }
    }

    /**
     * Render a table
     *
     * @return {ReactElement}
     */
    renderTable() {
        let { editing } = this.props;
        let { renderingFullList, sortColumns, sortDirections } = this.state;
        let tableProps = {
            sortColumns,
            sortDirections,
            onSort: this.handleSort,
        };
        if (renderingFullList) {
            tableProps.expandable = true;
            tableProps.selectable = true;
            tableProps.expanded = editing;
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
    }

    /**
     * Render table headings
     *
     * @return {ReactElement}
     */
    renderHeadings() {
        return (
            <tr>
                {this.renderTitleColumn()}
                {this.renderUsersColumn()}
                {this.renderModifiedTimeColumn()}
            </tr>
        );
    }

    /**
     * Render table rows
     *
     * @return {Array<ReactElement>}
     */
    renderRows() {
        let { env, roles, users } = this.props;
        let { renderingFullList, sortColumns, sortDirections } = this.state;
        if (!renderingFullList) {
            roles = filterRoles(roles);
        }
        roles = sortRoles(roles, users, env, sortColumns, sortDirections);
        return _.map(roles, (role) => {
            return this.renderRow(role);
        });
    }

    /**
     * Render a table row
     *
     * @param  {Object} role
     *
     * @return {ReactElement}
     */
    renderRow(role) {
        let { env } = this.props;
        let { renderingFullList, restoringRoleIDs, disablingRoleIDs } = this.state;
        let { t } = env.locale;
        let classes = [];
        let onClick, title;
        if (role.deleted) {
            classes.push('deleted');
            title = t('role-list-status-deleted');
        } else if (role.disabled) {
            classes.push('disabled');
            title = t('role-list-status-disabled');
        }
        if (renderingFullList) {
            if (role.deleted || role.disabled) {
                if (_.includes(restoringRoleIDs, role.id)) {
                    classes.push('selected');
                }
            } else {
                classes.push('fixed');
                if (!_.includes(disablingRoleIDs, role.id)) {
                    classes.push('selected');
                }
            }
            onClick = this.handleRowClick;
        }
        let props = {
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
    }

    /**
     * Render title column, either the heading or a data cell
     *
     * @param  {Object|null} role
     *
     * @return {ReactElement}
     */
    renderTitleColumn(role) {
        let { route, env } = this.props;
        let { renderingFullList, restoringRoleIDs, disablingRoleIDs } = this.state;
        let { t, p } = env.locale;
        if (!role) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            let title = p(role.details.title) || '-';
            let url, badge;
            if (renderingFullList) {
                // add a badge next to the name if we're disabling or
                // restoring a role
                let includedBefore, includedAfter;
                if (role.deleted || role.disabled) {
                    includedBefore = false;
                    includedAfter = _.includes(restoringRoleIDs, role.id);
                } else {
                    includedBefore = true;
                    includedAfter = !_.includes(disablingRoleIDs, role.id);
                }
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="reactivate" env={env} />;
                    } else {
                        badge = <ActionBadge type="disable" env={env} />;
                    }
                }
            } else {
                let params = { roleID: role.id };
                url = route.find('role-summary-page', params);
            }
            return (
                <td>
                    <a href={url}>{title}</a> {badge}
                </td>
            );
        }
    }

    /**
     * Render users column, either the heading or a data cell
     *
     * @param  {Object|null} role
     *
     * @return {ReactElement|null}
     */
    renderUsersColumn(role) {
        let { route, env, users } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!role) {
            return <TH id="users">{t('table-heading-users')}</TH>;
        } else {
            let props = {
                users: findUsers(users, role),
                route,
                env,
            };
            return <td><UserTooltip {...props} /></td>;
        }
    }

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} role
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn(role) {
        let { env } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!role) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            let props = {
                time: role.mtime,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }

    /**
     * Called when user clicks a table heading
     *
     * @param  {Object} evt
     */
    handleSort = (evt) => {
        this.setState({
            sortColumns: evt.columns,
            sortDirections: evt.directions
        });
    }

    /**
     * Called when user click add button
     *
     * @param  {Event} evt
     */
    handleAddClick = (evt) => {
        let { route } = this.props;
        return route.push('role-summary-page', { roleID: 'new' });
    }

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick = (evt) => {
        this.setEditability(true);
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        this.setEditability(false);
    }

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick = async (evt) => {
        let { database, env, roles } = this.props;
        let { disablingRoleIDs, restoringRoleIDs } = this.state;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let messages = [
            t('role-list-confirm-disable-$count', disablingRoleIDs.length),
            t('role-list-confirm-reactivate-$count', restoringRoleIDs.length),
        ];
        let bypass = [
            _.isEmpty(disablingRoleIDs) ? true : undefined,
            _.isEmpty(restoringRoleIDs) ? true : undefined,
        ];
        let confirmed = await confirmation.askSeries(messages, bypass);
        if (confirmed) {
            this.setState({ problems: {} });
            let db = database.use({ schema: 'global', by: this });
            let currentUserID = await db.start();
            let rolesAfter = [];
            _.each(roles, (role) => {
                let flags = {};
                if (_.includes(disablingRoleIDs, role.id)) {
                    flags.disabled = true;
                } else if (_.includes(restoringRoleIDs, role.id)) {
                    flags.disabled = flags.deleted = false;
                } else {
                    return;
                }
                let roleAfter = _.assign({}, role, flags);
                rolesAfter.push(roleAfter);
            });
            try {
                await db.save({ table: 'role' }, rolesAfter);
                this.setState({ hasChanges: false }, () => {
                    this.setEditability(false);
                });
            } catch (err) {
                let problems = { unexpected: err.message };
                this.setState({ problems });
            }
        }
    }

    /**
     * Called when user clicks a row in edit mode
     *
     * @param  {Event} evt
     */
    handleRowClick = (evt) => {
        let { database, roles } = this.props;
        let { restoringRoleIDs, disablingRoleIDs } = this.state;
        let roleID = parseInt(evt.currentTarget.getAttribute('data-role-id'));
        let role = _.find(roles, { id: roleID });
        if (role.deleted || role.disabled) {
            if (_.includes(restoringRoleIDs, role.id)) {
                restoringRoleIDs = _.without(restoringRoleIDs, role.id);
            } else {
                restoringRoleIDs = _.concat(restoringRoleIDs, role.id);
            }
        } else {
            if (_.includes(disablingRoleIDs, role.id)) {
                disablingRoleIDs = _.without(disablingRoleIDs, role.id);
            } else {
                disablingRoleIDs = _.concat(disablingRoleIDs, role.id);
            }
        }
        let hasChanges = !_.isEmpty(restoringRoleIDs) || !_.isEmpty(disablingRoleIDs);
        this.setState({ restoringRoleIDs, disablingRoleIDs, hasChanges });
    }
}

let filterRoles = memoizeWeak(null, function(roles) {
    return _.filter(roles, (role) => {
        return !role.deleted && !role.disabled;
    });
});

let sortRoles = memoizeWeak(null, function(roles, users, env, columns, directions) {
    let { p } = env.locale;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (role) => {
                    return p(role.details.title)
                };
            case 'users':
                return (role) => {
                    return _.size(findUsers(users, role));
                };
            default:
                return column;
        }
    });
    return _.orderBy(roles, columns, directions);
});

let findUsers = memoizeWeak(null, function(users, role) {
    return _.filter(users, (user) => {
        return _.includes(user.role_ids, role.id);
    });
});

export {
    RoleListPage as default,
    RoleListPage,
    RoleListPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    RoleListPage.propTypes = {
        editing: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    RoleListPageSync.propTypes = {
        editing: PropTypes.bool,
        roles: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
