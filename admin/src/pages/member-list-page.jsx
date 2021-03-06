import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as RoleFinder from 'objects/finders/role-finder';
import * as UserFinder from 'objects/finders/user-finder';
import * as StatisticsFinder from 'objects/finders/statistics-finder';

// widgets
import PushButton from 'widgets/push-button';
import ComboButton from 'widgets/combo-button';
import SortableTable, { TH } from 'widgets/sortable-table';
import ProfileImage from 'widgets/profile-image';
import ActivityTooltip from 'tooltips/activity-tooltip';
import RoleTooltip from 'tooltips/role-tooltip';
import ActionBadge from 'widgets/action-badge';
import ModifiedTimeTooltip from 'tooltips/modified-time-tooltip'
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';

import './member-list-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Member List page.
 *
 * @extends AsyncComponent
 */
class MemberListPage extends AsyncComponent {
    static displayName = 'MemberListPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env, projectID, editing } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            project: undefined,
            users: undefined,
            roles: undefined,

            database,
            route,
            env,
            editing,
        };
        meanwhile.show(<MemberListPageSync {...props} />);
        let currentUserID = await db.start();
        props.project = await ProjectFinder.findProject(db, projectID);
        props.users = await UserFinder.findExistingUsers(db);
        meanwhile.show(<MemberListPageSync {...props} />);
        props.roles = await RoleFinder.findRolesOfUsers(db, props.users);
        meanwhile.show(<MemberListPageSync {...props} />);
        let users = findUsers(props.users, props.project);
        props.statistics = await StatisticsFinder.findDailyActivitiesOfUsers(db, props.project, users);
        return <MemberListPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the Member List page.
 *
 * @extends PureComponent
 */
class MemberListPageSync extends PureComponent {
    static displayName = 'MemberListPageSync';

    constructor(props) {
        let { editing } = props;
        super(props);
        this.state = {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
            removingUserIDs: [],
            addingUserIDs: [],
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
                removingUserIDs: [],
                addingUserIDs: [],
                changes: false,
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
        let { t } = env.locale;
        return (
            <div className="member-list-page">
                {this.renderButtons()}
                <h2>{t('member-list-title')}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {this.renderTable()}
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
        let { env, project, users, editing } = this.props;
        let { hasChanges, problems } = this.state;
        let { t } = env.locale;
        if (editing) {
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('member-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('member-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            let userIDs = _.get(project, 'user_ids');
            let membersPending = _.some(users, (user) => {
                return !_.includes(userIDs, user.id);
            });
            let preselected = (membersPending) ? 'approve' : undefined;
            let empty = _.isEmpty(users);
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
    }

    /**
     * Render a table
     *
     * @return {ReactElement}
     */
    renderTable() {
        let { env, editing } = this.props;
        let { renderingFullList, sortColumns, sortDirections } = this.state;
        let { t } = env.locale;
        let tableProps = {
            sortColumns,
            sortDirections,
            onSort: this.handleSort,
        };
        if (renderingFullList) {
            tableProps.expandable = true;
            tableProps.selectable = true;
            tableProps.expanded = editing;
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
                {this.renderTypeColumn()}
                {this.renderRolesColumn()}
                {this.renderDateRangeColumn()}
                {this.renderLastMonthColumn()}
                {this.renderThisMonthColumn()}
                {this.renderToDateColumn()}
                {this.renderModifiedTimeColumn()}
            </tr>
        );
    }

    /**
     * Render table rows
     *
     * @type {Array<ReactElement>}
     */
    renderRows() {
        let { env, project, users, roles, statistics } = this.props;
        let { renderingFullList, sortColumns, sortDirections } = this.state;
        if (renderingFullList) {
            // list all users when we're editing the list
        } else {
            // list only those who're in the project--or are trying to join
            users = findUsers(users, project);
        }
        users = sortUsers(users, roles, statistics, env, sortColumns, sortDirections);
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
        let { env, project } = this.props;
        let { renderingFullList, removingUserIDs, addingUserIDs } = this.state;
        let { t } = env.locale;
        let classes = [];
        let title, onClick;
        let existing = _.includes(project.user_ids, user.id);
        let pending = _.includes(user.requested_project_ids, project.id);
        if (!existing) {
            if (pending) {
                classes.push('pending');
                title = t('member-list-status-pending');
            } else {
                classes.push('disabled');
                title = t('member-list-status-non-member');
            }
        }
        if (renderingFullList) {
            if (existing || pending) {
                classes.push('fixed');
            }
            if (existing) {
                if (!_.includes(removingUserIDs, user.id)) {
                    classes.push('selected');
                }
            } else {
                if (_.includes(addingUserIDs, user.id)) {
                    classes.push('selected');
                }
            }
            onClick = this.handleRowClick;
        }
        let props = {
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
    }

    /**
     * Render name column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderNameColumn(user) {
        let { env, project, route } = this.props;
        let { renderingFullList, removingUserIDs, addingUserIDs } = this.state;
        let { t, p } = env.locale;
        if (!user) {
            return <TH id="name">{t('table-heading-name')}</TH>;
        } else {
            let name = p(user.details.name);
            let url, badge;
            if (renderingFullList) {
                // compare against original list if the member will be added or removed
                let userIDs = _.get(project, 'user_ids', []);
                let includedBefore = _.includes(userIDs, user.id);
                let includedAfter;
                if (includedBefore) {
                    includedAfter = !_.includes(removingUserIDs, user.id);
                } else {
                    includedAfter = _.includes(addingUserIDs, user.id);
                }
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="add" env={env} />;
                    } else {
                        badge = <ActionBadge type="remove" env={env} />;
                    }
                }
            } else {
                // don't create the link when we're editing the list
                let params = _.clone(route.params);
                params.userID = user.id;
                url = route.find('member-summary-page', params);
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
     * Render Type column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderTypeColumn(user) {
        let { env } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!user) {
            return <TH id="type">{t('table-heading-type')}</TH>;
        } else {
            return <td>{t(`user-list-type-${user.type}`)}</td>;
        }
    }

    /**
     * Render roles column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement}
     */
    renderRolesColumn(user) {
        let { env, route, roles } = this.props;
        let { renderingFullList } = this.state;
        let { t } = env.locale;
        if (!env.isWiderThan('standard')) {
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
            let url;
            if (!renderingFullList && email) {
                url = `mailto:${email}`;
            }
            return <td><a href={url}>{email}</a></td>;
        }
    }

    /**
     * Render active period column, either the heading or a data cell
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderDateRangeColumn(user, editing) {
        let { env, statistics } = this.props;
        let { renderingFullList } = this.state;
        let { t, localeCode } = env.locale;
        if (!env.isWiderThan('ultra-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="range">{t('table-heading-date-range')}</TH>
        } else {
            let start, end;
            let range = _.get(statistics, [ user.id, 'range' ]);
            if (range) {
                start = Moment(range.start).locale(localeCode).format('ll');
                end = Moment(range.end).locale(localeCode).format('ll');
            }
            return <td>{t('date-range-$start-$end', start, end)}</td>;
        }
    }

    /**
     * Render column showing the number of stories last month
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderLastMonthColumn(user) {
        let { env, statistics } = this.props;
        let { renderingFullList } = this.state;
        let { t } = env.locale;
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="last_month">{t('table-heading-last-month')}</TH>
        } else {
            let props = {
                statistics: _.get(statistics, [ user.id, 'last_month' ]),
                disabled: renderingFullList,
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    /**
     * Render column showing the number of stories this month
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderThisMonthColumn(user) {
        let { env, statistics } = this.props;
        let { renderingFullList } = this.state;
        let { t } = env.locale;
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="this_month">{t('table-heading-this-month')}</TH>
        } else {
            let props = {
                statistics: _.get(statistics, [ user.id, 'this_month' ]),
                disabled: renderingFullList,
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    /**
     * Render column showing the number of stories to date
     *
     * @param  {Object|null} user
     *
     * @return {ReactElement|null}
     */
    renderToDateColumn(user) {
        let { env, statistics } = this.props;
        let { renderingFullList } = this.state;
        let { t } = env.locale;
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="to_date">{t('table-heading-to-date')}</TH>
        } else {
            let props = {
                statistics: _.get(statistics, [ user.id, 'to_date' ]),
                disabled: renderingFullList,
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
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
        let { env, statistics } = this.props;
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
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick = (evt) => {
        this.setEditability(true);
    }

    /**
     * Called when user clicks add button
     *
     * @param  {Event} evt
     */
    handleAddClick = (evt) => {
        let { route } = this.props;
        let params = _.clone(route.params);
        params.userID = 'new';
        return route.push('member-summary-page', params);
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
     *
     * @return {Promise}
     */
    handleSaveClick = async (evt) => {
        let { database, project } = this.props;
        let { removingUserIDs, addingUserIDs } = this.state;
        let db = database.use({ schema: 'global', by: this });
        let currentUserID = await db.start();
        let userIDs = project.user_ids;
        let userIDsAfter = _.union(_.difference(userIDs, removingUserIDs), addingUserIDs);
        let columns = {
            id: project.id,
            user_ids: userIDsAfter,
        };
        try {
            let projectAfter = await db.saveOne({ table: 'project' }, columns);
            this.setState({ hasChanges: false }, () => {
                this.setEditability(false);
            });
        } catch (err) {
            let problems = { unexpected: err.message };
            this.setState({ problems });
        }
    }

    /**
     * Called when user clicks approve all button
     *
     * @param  {Event} evt
     *
     * @return {Promise}
     */
    handleApproveClick = async (evt) => {
        let { database, project, users } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let currentUserID = await db.start();
        let pendingUsers = _.filter(users, (user) => {
            if (_.includes(user.requested_project_ids, project.id)) {
                return true;
            }
        });
        let adding = _.map(pendingUsers, 'id');
        let userIDs = project.user_ids;
        let userIDsAfter = _.union(userIDs, adding);
        let columns = {
            id: project.id,
            user_ids: userIDsAfter,
        };
        return db.saveOne({ table: 'project' }, columns);
    }

    /**
     * Called when user clicks reject all button
     *
     * @param  {Event} evt
     *
     * @return {Promise}
     */
    handleRejectClick = async (evt) => {
        let { database, project, users } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let currentUserID = await db.start();
        let pendingUsers = _.filter(users, (user) => {
            if (_.includes(user.requested_project_ids, project.id)) {
                return true;
            }
        });
        let changes = _.map(pendingUsers, (user) => {
            return {
                id: user.id,
                requested_project_ids: _.without(user.requested_project_ids, project.id),
            };
        });
        return db.save({ table: 'user' }, changes);
    }

    /**
     * Called when user clicks on a row in edit mode
     *
     * @param  {Event} evt
     */
    handleRowClick = (evt) => {
        let { project } = this.props;
        let { addingUserIDs, removingUserIDs } = this.state;
        let userID = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        if (_.includes(project.user_ids, userID)) {
            if (_.includes(removingUserIDs, userID)) {
                removingUserIDs = _.without(removingUserIDs, userID);
            } else {
                removingUserIDs = _.concat(removingUserIDs, userID);
            }
        } else {
            if (_.includes(addingUserIDs, userID)) {
                addingUserIDs = _.without(addingUserIDs, userID);
            } else {
                addingUserIDs = _.concat(addingUserIDs, userID);
            }
        }
        let hasChanges = !_.isEmpty(addingUserIDs) || !_.isEmpty(removingUserIDs);
        this.setState({ addingUserIDs, removingUserIDs, hasChanges });
    }
}

let sortUsers = memoizeWeak(null, function(users, roles, statistics, env, columns, directions) {
    let { p } = env.locale;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return (user) => {
                    return p(user.details.name);
                };
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

let findUsers = memoizeWeak(null, function(users, project) {
    if (project) {
        let hash = _.keyBy(users, 'id');
        let existingUsers = _.filter(_.map(project.user_ids, (id) => {
            return hash[id];
        }));
        let pendingUsers = _.filter(users, (user) => {
            return _.includes(user.requested_project_ids, project.id);
        });
        // need to use union() here, since user.requested_project_ids could contain
        // the project id even when project.user_ids has the user id
        //
        // this will happen right after the project is saved and the the updated
        // users (changed by backend) haven't been retrieved yet
        return _.union(existingUsers, pendingUsers);
    }
});

let findRoles = memoizeWeak(null, function(roles, user) {
    let hash = _.keyBy(roles, 'id');
    return _.filter(_.map(user.role_ids, (id) => {
        return hash[id];
    }));
});

export {
    MemberListPage as default,
    MemberListPage,
    MemberListPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MemberListPage.propTypes = {
        editing: PropTypes.bool,
        projectID: PropTypes.number.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    MemberListPageSync.propTypes = {
        editing: PropTypes.bool,
        project: PropTypes.object,
        users: PropTypes.arrayOf(PropTypes.object),
        roles: PropTypes.arrayOf(PropTypes.object),
        statistics: PropTypes.objectOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
