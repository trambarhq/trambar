import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as RoleFinder from 'objects/finders/role-finder';
import * as UserFinder from 'objects/finders/user-finder';
import UserTypes from 'objects/types/user-types';

// widgets
import PushButton from 'widgets/push-button';
import ComboButton from 'widgets/combo-button';
import SortableTable, { TH } from 'widgets/sortable-table';
import ProfileImage from 'widgets/profile-image';
import ProjectTooltip from 'tooltips/project-tooltip';
import RoleTooltip from 'tooltips/role-tooltip';
import ModifiedTimeTooltip from 'tooltips/modified-time-tooltip'
import ActionBadge from 'widgets/action-badge';
import ActionConfirmation from 'widgets/action-confirmation';
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';

import './user-list-page.scss';

/**
 * Asynchronous component that retrieves data needed by the User List page.
 *
 * @extends AsyncComponent
 */
class UserListPage extends AsyncComponent {
    static displayName = 'UserListPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env } = this.props;
        let { editing } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            database,
            route,
            env,
            editing,
        };
        meanwhile.show(<UserListPageSync {...props} />);
        let currentUserID = await db.start();
        props.users = await UserFinder.findAllUsers(db);
        meanwhile.show(<UserListPageSync {...props} />);
        props.projects = await ProjectFinder.findProjectsWithMembers(db, props.users);
        meanwhile.show(<UserListPageSync {...props} />);
        props.roles = await RoleFinder.findRolesOfUsers(db, props.users);
        return <UserListPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the User List page.
 *
 * @extends PureComponent
 */
class UserListPageSync extends PureComponent {
    static displayName = 'UserListPageSync';

    constructor(props) {
        let { editing } = props;
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        this.state = {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
            restoringUserIDs: [],
            disablingUserIDs: [],
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
            };
        } else if (!editing && renderingFullList) {
            return {
                renderingFullList: false,
                restoringUserIDs: [],
                disablingUserIDs: [],
                hasChanges: false,
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
        let params = { editing: edit };
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
            <div className="user-list-page">
                {this.renderButtons()}
                <h2>{t('user-list-title')}</h2>
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
        let { env, users, editing } = this.props;
        let { hasChanges } = this.state;
        let { t } = env.locale;
        if (editing) {
            return (
                <div className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('user-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('user-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            let empty = _.isEmpty(users);
            return (
                <div className="buttons">
                    <ComboButton>
                        <option name="add" onClick={this.handleAddClick}>
                            {t('user-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" disabled={empty} onClick={this.handleEditClick}>
                        {t('user-list-edit')}
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
            tableProps.expanded = editing;
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
    }

    /**
     * Render table headings
     *
     * @return {ReactElement}
     */
    renderHeadings() {
        return (
            <tr>
                {this.renderNameColumn()}
                {this.renderUsernameColumn()}
                {this.renderTypeColumn()}
                {this.renderRolesColumn()}
                {this.renderProjectsColumn()}
                {this.renderEmailColumn()}
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
        let { env, users, roles, projects } = this.props;
        let { renderingFullList, sortColumns, sortDirections } = this.state;
        if (!renderingFullList) {
            users = filterUsers(users);
        }
        users = sortUsers(users, roles, projects, env, sortColumns, sortDirections);
        return _.map(users, (user) => {
            return this.renderRow(user);
        });
    }

    /**
     * Render a table row
     *
     * @param  {Object} user
     *
     * @return {ReactElement}
     */
    renderRow(user) {
        let { env } = this.props;
        let { renderingFullList, restoringUserIDs, disablingUserIDs } = this.state;
        let { t } = env.locale;
        let classes = [];
        let onClick, title;
        if (user.deleted) {
            classes.push('deleted');
            title = t('user-list-status-deleted');
        } else if (user.disabled) {
            classes.push('disabled');
            title = t('user-list-status-disabled');
        }
        if (renderingFullList) {
            if (user.deleted || user.disabled) {
                if (_.includes(restoringUserIDs, user.id)) {
                    classes.push('selected');
                }
            } else {
                classes.push('fixed');
                if (!_.includes(disablingUserIDs, user.id)) {
                    classes.push('selected');
                }
            }
            onClick = this.handleRowClick;
        }
        let props = {
            className: classes.join(' '),
            'data-user-id': user.id,
            title,
            onClick,
        };
        return (
            <tr key={user.id} {...props}>
                {this.renderNameColumn(user)}
                {this.renderUsernameColumn(user)}
                {this.renderTypeColumn(user)}
                {this.renderRolesColumn(user)}
                {this.renderProjectsColumn(user)}
                {this.renderEmailColumn(user)}
                {this.renderModifiedTimeColumn(user)}
            </tr>
        );
    }

    /**
     * Render name column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderNameColumn(user) {
        let { route, env } = this.props;
        let { renderingFullList, restoringUserIDs, disablingUserIDs } = this.state;
        let { t, p } = env.locale;
        if (!user) {
            return <TH id="name">{t('table-heading-name')}</TH>;
        } else {
            let name = p(user.details.name);
            let url, badge;
            if (renderingFullList) {
                // add a badge next to the name if we're approving, restoring or
                // disabling a user
                let includedBefore, includedAfter;
                if (user.deleted || user.disabled) {
                    includedBefore = false;
                    includedAfter = _.includes(restoringUserIDs, user.id);
                } else {
                    includedBefore = true;
                    includedAfter = !_.includes(disablingUserIDs, user.id);
                }
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="reactivate" env={env} />;
                    } else {
                        badge = <ActionBadge type="disable" env={env} />;
                    }
                }
            } else {
                // don't create the link when we're editing the list
                let params = { userID: user.id }
                url = route.find('user-summary-page', params);
            }
            let image = <ProfileImage user={user} env={env} />;
            return (
                <td>
                    <a href={url}>{image} {name}</a>{badge}
                </td>
            );
        }
    }

    /**
     * Render username column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderUsernameColumn(user) {
        let { env } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!user) {
            return <TH id="username">{t('table-heading-username')}</TH>;
        } else {
            return (
                <td>{user.username}</td>
            );
        }
    }

    /**
     * Render Type column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderTypeColumn(user) {
        let { env } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!user) {
            return <TH id="type">{t('table-heading-type')}</TH>;
        } else {
            return <td>{t(`user-list-type-${user.type}`)}</td>;
        }
    }

    /**
     * Render projects column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderProjectsColumn(user) {
        let { route, env, projects } = this.props;
        let { renderingFullList } = this.state;
        let { t } = env.locale;
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="projects">{t('table-heading-projects')}</TH>;
        } else {
            let props = {
                projects: findProjects(projects, user),
                omit: 1,
                disabled: renderingFullList,
                route,
                env,
            };
            return <td><ProjectTooltip {...props} /></td>;
        }
    }

    /**
     * Render roles column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderRolesColumn(user) {
        let { route, env, roles } = this.props;
        let { renderingFullList } = this.state;
        let { t } = env.locale;
        if (!env.isWiderThan('wide')) {
            return null;
        }
        if (!user) {
            return <TH id="roles">{t('table-heading-roles')}</TH>;
        } else {
            let props = {
                roles: findRoles(roles, user),
                disabled: renderingFullList,
                route,
                env,
            };
            return <td><RoleTooltip {...props} /></td>;
        }
    }

    /**
     * Render email column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderEmailColumn(user) {
        let { env } = this.props;
        let { renderingFullList } = this.state;
        let { t } = env.locale;
        if (!env.isWiderThan('wide')) {
            return null;
        }
        if (!user) {
            return <TH id="email">{t('table-heading-email')}</TH>;
        } else {
            let contents = '-';
            let email = user.details.email;
            if (email) {
                let url;
                if (!renderingFullList) {
                    url = `mailto:${email}`;
                }
                contents = <a href={url}>{email}</a>;
            }
            return <td className="email">{contents}</td>;
        }
    }


    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn(user) {
        let { env } = this.props;
        let { renderingFullList } = this.state;
        let { t } = env.locale;
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!user) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            let props = {
                time: user.mtime,
                disabled: renderingFullList,
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
     * Called when user clicks new button
     *
     * @param  {Event} evt
     */
    handleAddClick = (evt) => {
        let { route } = this.props;
        return route.push('user-summary-page', { userID: 'new' });
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
        let { database, env, users } = this.props;
        let { disablingUserIDs, restoringUserIDs } = this.state;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let messages = [
            t('user-list-confirm-disable-$count', disablingUserIDs.length),
            t('user-list-confirm-reactivate-$count', restoringUserIDs.length),
        ];
        let bypass = [
            _.isEmpty(disablingUserIDs) ? true : undefined,
            _.isEmpty(restoringUserIDs) ? true : undefined,
        ];
        let confirmed = await confirmation.askSeries(messages, bypass);
        if (confirmed) {
            this.setState({ problems: {} });
            let db = database.use({ schema: 'global', by: this });
            let currentUserID = await db.start();
            let usersAfter = [];
            _.each(users, (user) => {
                let flags = {};
                if (_.includes(disablingUserIDs, user.id)) {
                    flags.disabled = true;
                } else if (_.includes(restoringUserIDs, user.id)) {
                    flags.disabled = flags.deleted = false;
                } else {
                    return;
                }
                let userAfter = _.assign({}, user, flags);
                usersAfter.push(userAfter);
            });
            try {
                await db.save({ table: 'user' }, usersAfter);
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
        let { users } = this.props;
        let { restoringUserIDs, disablingUserIDs } = this.state;
        let userID = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        let user = _.find(users, { id: userID });
        if (user.deleted || user.disabled) {
            if (_.includes(restoringUserIDs, user.id)) {
                restoringUserIDs = _.without(restoringUserIDs, user.id);
            } else {
                restoringUserIDs = _.concat(restoringUserIDs, user.id);
            }
        } else {
            if (_.includes(disablingUserIDs, user.id)) {
                disablingUserIDs = _.without(disablingUserIDs, user.id);
            } else {
                disablingUserIDs = _.concat(disablingUserIDs, user.id);
            }
        }
        let hasChanges = !_.isEmpty(restoringUserIDs) || !_.isEmpty(disablingUserIDs);
        this.setState({ restoringUserIDs, disablingUserIDs, hasChanges });
    }
}

let sortUsers = memoizeWeak(null, function(users, roles, projects, env, columns, directions) {
    let { p } = env.locale;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return (user) => {
                    return p(user.details.name);
                };
            case 'username':
                return (user) => {
                    return _.toLower(user.username);
                };
            case 'type':
                return (user) => {
                    return _.indexOf(UserTypes, user.type);
                };
            case 'roles':
                return (user) => {
                    let role0 = _.first(findRoles(roles, user));
                    if (!role0) {
                        return '';
                    }
                    return p(role0.details.title) || role0.name;
                };
            case 'projects':
                return (user) => {
                    let project0 = _.first(findProjects(projects, user));
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

let filterUsers = memoizeWeak(null, function(users) {
    return _.filter(users, (user) => {
        return (user.disabled !== true) && (user.deleted !== true);
    });
});

let findProjects = memoizeWeak(null, function(projects, user) {
    return _.filter(projects, (project) => {
        return _.includes(project.user_ids, user.id);
    });
});

let findRoles = memoizeWeak(null, function(roles, user) {
    let hash = _.keyBy(roles, 'id');
    return _.filter(_.map(user.role_ids, (id) => {
        return hash[id];
    }));
});

export {
    UserListPage as default,
    UserListPage,
    UserListPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserListPage.propTypes = {
        editing: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    UserListPageSync.propTypes = {
        editing: PropTypes.bool,
        users: PropTypes.arrayOf(PropTypes.object),
        projects: PropTypes.arrayOf(PropTypes.object),
        roles: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
