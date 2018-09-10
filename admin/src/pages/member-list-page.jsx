import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Memoize from 'utils/memoize';
import ProjectFinder from 'objects/finders/project-finder';
import RoleFinder from 'objects/finders/role-finder';
import UserFinder from 'objects/finders/user-finder';
import StatisticsFinder from 'objects/finders/statistics-finder';

// widgets
import PushButton from 'widgets/push-button';
import ComboButton from 'widgets/combo-button';
import SortableTable from 'widgets/sortable-table', TH = SortableTable.TH;
import ProfileImage from 'widgets/profile-image';
import ActivityTooltip from 'tooltips/activity-tooltip';
import RoleTooltip from 'tooltips/role-tooltip';
import ActionBadge from 'widgets/action-badge';
import ModifiedTimeTooltip from 'tooltips/modified-time-tooltip'
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';

import './member-list-page.scss';

class MemberListPage extends AsyncComponent {
    static displayName = 'MemberListPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            project: null,
            users: null,
            roles: null,

            database,
            route,
            env,
        };
        meanwhile.show(<MemberListPageSync {...props} />);
        return db.start().then((userID) => {
            return ProjectFinder.findProject(db, route.params.project).then((project) => {
                props.project = project;
            });
        }).then(() => {
            return UserFinder.findExistingUsers(db).then((users) => {
                props.users = users;
            });
        }).then(() => {
            meanwhile.show(<MemberListPageSync {...props} />);
            return RoleFinder.findRolesOfUsers(db, props.users).then((roles) => {
                props.roles = roles;
            });
        }).then(() => {
            meanwhile.show(<MemberListPageSync {...props} />);
            let users = findUsers(props.users, props.project)
            return StatisticsFinder.findDailyActivitiesOfUsers(db, props.project, users).then((statistics) => {
                props.statistics = statistics;
            });
        }).then(() => {
            return <MemberListPageSync {...props} />;
        });
    }
});

class MemberListPageSync extends PureComponent {
    static displayName = 'MemberListPage.Sync';

    constructor(props) {
        super(props);
        this.state = {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
            removingUserIDs: [],
            addingUserIDs: [],
            hasChanges: false,
            renderingFullList: this.isEditing(),
            problems: {},
        };
    }

    /**
     * Return true when the URL indicate edit mode
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isEditing(props) {
        props = props || this.props;
        return props.route.params.edit;
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
        params.edit = edit;
        return route.replace(route.name, params);
    }

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            if (this.isEditing(nextProps)) {
                this.setState({
                    renderingFullList: true,
                    removingUserIDs: [],
                    addingUserIDs: [],
                    changes: false,
                });
            } else {
                setTimeout(() => {
                    if (!this.isEditing()) {
                        this.setState({ renderingFullList: false, problems: {} });
                    }
                }, 500);
            }
        }
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
        let { env, project, users } = this.props;
        let { hasChanges, problems } = this.state;
        let { t } = env.locale;
        if (this.isEditing()) {
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
        let { renderingFullList, sortColumns, sortDirections, } = this.state;
        let { t } = env.locale;
        let tableProps = {
            sortColumns,
            sortDirections,
            onSort: this.handleSort,
        };
        if (renderingFullList) {
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
        if (this.state.renderingFullList) {
            // list all users when we're editing the list
        } else {
            // list only those who're in the project--or are trying to join
            users = findUsers(users, project);
        }
        users = sortUsers(users, roles, statistics, env, sortColumns, sortDirections);
        return _.map(users, (user) => {
            return this.renderRow;
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
                url = route.find('user-summary-page', {
                    user: user.id,
                    project: this.props.project.id,
                });
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
        if (env.isBelowMode('narrow')) {
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
        if (env.isBelowMode('standard')) {
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
        if (env.isBelowMode('wide')) {
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
        if (env.isBelowMode('ultra-wide')) {
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
        if (env.isBelowMode('super-wide')) {
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
        if (env.isBelowMode('super-wide')) {
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
        if (env.isBelowMode('super-wide')) {
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
        if (env.isBelowMode('standard')) {
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
        let params = _.clone(route.parameters);
        params.user = 'new';
        return route.push('user-summary-page', params);
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
    handleSaveClick = (evt) => {
        let { database, project } = this.props;
        let { removingUserIDs, addingUserIDs } = this.state;
        let db = database.use({ schema: 'global', by: this });
        return db.start().then((currentUserID) => {
            let userIDs = project.user_ids;
            let userIDsAfter = _.union(_.difference(userIDs, removingUserIDs), addingUserIDs);
            let columns = {
                id: this.props.project.id,
                user_ids: userIDsAfter,
            };
            return db.saveOne({ table: 'project' }, columns).then((project) => {
                this.setState({ hasChanges: false }, () => {
                    return this.setEditability(false);
                });
                return null;
            }).catch((err) => {
                let problems = { unexpected: err.message };
                this.setState({ problems });
            });
        });
    }

    /**
     * Called when user clicks approve all button
     *
     * @param  {Event} evt
     *
     * @return {Promise}
     */
    handleApproveClick = (evt) => {
        let { database, project, users } = this.props;
        let db = database.use({ schema: 'global', by: this });
        return db.start().then((userID) => {
            let pendingUsers = _.filter(users, (user) => {
                if (_.includes(user.requested_project_ids, project.id)) {
                    return true;
                }
            });
            let adding = _.map(pendingUsers, 'id');
            let userIDs = project.user_ids;
            let userIDsAfter = _.union(userIDs, adding);
            let columns = {
                id: this.props.project.id,
                user_ids: userIDsAfter,
            };
            return db.saveOne({ table: 'project' }, columns);
        });
    }

    /**
     * Called when user clicks reject all button
     *
     * @param  {Event} evt
     *
     * @return {Promise}
     */
    handleRejectClick = (evt) => {
        let { database, project, users } = this.props;
        let db = database.use({ schema: 'global', by: this });
        return db.start().then((userID) => {
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
        });
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

let sortUsers = Memoize(function(users, roles, statistics, env, columns, directions) {
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

let findUsers = Memoize(function(users, project) {
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
    } else {
        return [];
    }
});

let findRoles = Memoize(function(roles, user) {
    let hash = _.keyBy(roles, 'id');
    return _.filter(_.map(user.role_ids, (id) => {
        return hash[id];
    }));
});

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MemberListPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    MemberListPageSync.propTypes = {
        project: PropTypes.object,
        users: PropTypes.arrayOf(PropTypes.object),
        roles: PropTypes.arrayOf(PropTypes.object),
        statistics: PropTypes.objectOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}

export {
    MemberListPage as default,
    MemberListPage,
    MemberListPageSync,
};
