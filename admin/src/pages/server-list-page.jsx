import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import * as ServerFinder from 'objects/finders/server-finder';
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

import './server-list-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Server List page.
 *
 * @extends AsyncComponent
 */
class ServerListPage extends AsyncComponent {
    static displayName = 'ServerListPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env, editing } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            servers: undefined,
            users: undefined,

            database,
            route,
            env,
            editing,
        };
        meanwhile.show(<ServerListPageSync {...props} />);
        return db.start().then((currentUserID) => {
            return ServerFinder.findAllServers(db).then((servers) => {
                props.servers = servers;
            });
        }).then(() => {
            meanwhile.show(<ServerListPageSync {...props} />);
            return UserFinder.findActiveUsers(db).then((users) => {
                props.users = users;
            });
        }).then(() => {
            return <ServerListPageSync {...props} />;
        });
    }
}

/**
 * Synchronous component that actually renders the Server List page.
 *
 * @extends PureComponent
 */
class ServerListPageSync extends PureComponent {
    static displayName = 'ServerListPageSync';

    constructor(props) {
        let { editing } = props;
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        this.state = {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
            restoringServerIDs: [],
            disablingServerIDs: [],
            hasChanges: false,
            renderingFullList: editing,
            problems: {},
        };
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
     * Check if we're switching into edit mode
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { editing } = this.props;
        if (nextProps.editing !== editing) {
            if (nextProps.editing) {
                // initial list of ids to the current list
                this.setState({
                    renderingFullList: true,
                    restoringServerIDs: [],
                    disablingServerIDs: [],
                    hasChanges: false,
                });
            } else {
                setTimeout(() => {
                    let { editing } = this.props;
                    if (!editing) {
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
        let { setters } = this.components;
        let { t } = env.locale;
        return (
            <div className="server-list-page">
                {this.renderButtons()}
                <h2>{t('server-list-title')}</h2>
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
        let { env, servers, editing } = this.props;
        let { hasChanges } = this.state;
        let { t } = env.locale;
        if (editing) {
            return (
                <div className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('server-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('server-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            let preselected = 'add';
            let empty = _.isEmpty(servers);
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="add" onClick={this.handleAddClick}>
                            {t('server-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton name="edit" className="emphasis" disabled={empty} onClick={this.handleEditClick}>
                        {t('server-list-edit')}
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
                {this.renderTypeColumn()}
                {this.renderOAuthColumn()}
                {this.renderAPIColumn()}
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
        let { env, servers, users } = this.props;
        let { renderingFullList, sortColumns, sortDirections } = this.state;
        if (!renderingFullList) {
            servers = filterServers(servers);
        }
        servers = sortServers(servers, users, env, sortColumns, sortDirections);
        return _.map(servers, (server) => {
            return this.renderRow(server);
        });
    }

    /**
     * Render a table row
     *
     * @param  {Object} server
     *
     * @return {ReactElement}
     */
    renderRow(server) {
        let { env } = this.props;
        let { renderingFullList, restoringServerIDs, disablingServerIDs } = this.state;
        let { t } = env.locale;
        let classes = [];
        let onClick, title;
        if (server.deleted) {
            classes.push('deleted');
            title = t('server-list-status-deleted');
        } else if (server.disabled) {
            classes.push('disabled');
            title = t('server-list-status-disabled');
        }
        if (renderingFullList) {
            if (server.deleted || server.disabled) {
                if (_.includes(restoringServerIDs, server.id)) {
                    classes.push('selected');
                }
            } else {
                classes.push('fixed');
                if (!_.includes(disablingServerIDs, server.id)) {
                    classes.push('selected');
                }
            }
            onClick = this.handleRowClick;
        }
        let props = {
            className: classes.join(' '),
            'data-server-id': server.id,
            title,
            onClick,
        };
        return (
            <tr key={server.id} {...props}>
                {this.renderTitleColumn(server)}
                {this.renderTypeColumn(server)}
                {this.renderOAuthColumn(server)}
                {this.renderAPIColumn(server)}
                {this.renderUsersColumn(server)}
                {this.renderModifiedTimeColumn(server)}
            </tr>
        );
    }

    /**
     * Render title column, either the heading or a data cell
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement}
     */
    renderTitleColumn(server) {
        let { route, env } = this.props;
        let { renderingFullList, restoringServerIDs, disablingServerIDs } = this.state;
        let { t, p } = env.locale;
        if (!server) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            let title = p(server.details.title) || t(`server-type-${server.type}`);
            let url, badge;
            if (renderingFullList) {
                // add a badge next to the name if we're disabling or
                // restoring a server
                let includedBefore, includedAfter;
                if (server.deleted || server.disabled) {
                    includedBefore = false;
                    includedAfter = _.includes(restoringServerIDs, server.id);
                } else {
                    includedBefore = true;
                    includedAfter = !_.includes(disablingServerIDs, server.id);
                }
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="reactivate" env={env} />;
                    } else {
                        badge = <ActionBadge type="disable" env={env} />;
                    }
                }
            } else {
                let params = { serverID: server.id };
                url = route.find('server-summary-page', params);
            }
            let iconName = getServerIcon(server.type);
            let icon = <i className={`fa fa-${iconName} fa-fw`} />;
            return (
                <td>
                    <a href={url}>{icon} {title}</a>{badge}
                </td>
            );
        }
    }

    /**
     * Render type column, either the heading or a data cell
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement}
     */
    renderTypeColumn(server) {
        let { env } = this.props;
        let { t } = env.locale;
        if (!server) {
            return <TH id="type">{t('table-heading-type')}</TH>;
        } else {
            return <td>{t(`server-type-${server.type}`)}</td>
        }
    }

    /**
     * Render column indicating whether oauth authentication is active
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement}
     */
    renderOAuthColumn(server) {
        let { env } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('wide')) {
            return null;
        }
        if (!server) {
            return <TH id="oauth">{t('table-heading-oauth')}</TH>;
        } else {
            let active = hasOAuthCredentials(server);
            return <td>{t(`server-list-oauth-${active}`)}</td>
        }
    }

    /**
     * Render column indicating whether oauth authentication is active
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement}
     */
    renderAPIColumn(server) {
        let { env } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('wide')) {
            return null;
        }
        if (!server) {
            return <TH id="api">{t('table-heading-api-access')}</TH>;
        } else {
            let active = hasAPICredentials(server);
            return <td>{t(`server-list-api-access-${active}`)}</td>
        }
    }

    /**
     * Render users column, either the heading or a data cell
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement|null}
     */
    renderUsersColumn(server) {
        let { route, env, users } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!server) {
            return <TH id="users">{t('table-heading-users')}</TH>;
        } else {
            let props = {
                users: findUsers(users, server),
                route,
                env,
            };
            return <td><UserTooltip {...props} /></td>;
        }
    }

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn(server) {
        let { env } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!server) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            let props = {
                time: server.mtime,
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
        return route.push('server-summary-page', { serverID: 'new' });
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
    handleSaveClick = (evt) => {
        let { database, env, servers } = this.props;
        let { disablingServerIDs, restoringServerIDs } = this.state;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let messages = [
            t('server-list-confirm-disable-$count', disablingServerIDs.length),
            t('server-list-confirm-reactivate-$count', restoringServerIDs.length),
        ];
        let bypass = [
            _.isEmpty(disablingServerIDs) ? true : undefined,
            _.isEmpty(restoringServerIDs) ? true : undefined,
        ];
        return confirmation.askSeries(messages, bypass).then((confirmed) => {
            if (!confirmed) {
                return;
            }
            this.setState({ problems: {} });
            let db = database.use({ schema: 'global', by: this });
            return db.start().then((currentUserID) => {
                let serversAfter = [];
                _.each(servers, (server) => {
                    let flags = {};
                    if (_.includes(disablingServerIDs, server.id)) {
                        flags.disabled = true;
                    } else if (_.includes(restoringServerIDs, server.id)) {
                        flags.disabled = flags.deleted = false;
                    } else {
                        return;
                    }
                    let serverAfter = _.assign({}, server, flags);
                    serversAfter.push(serverAfter);
                });
                return db.save({ table: 'server' }, serversAfter).then((servers) => {
                    this.setState({ hasChanges: false }, () => {
                        this.setEditability(false);
                    });
                    return null;
                }).catch((err) => {
                    let problems = { unexpected: err.message };
                    this.setState({ problems });
                });
            });
        });
    }

    /**
     * Called when user clicks a row in edit mode
     *
     * @param  {Event} evt
     */
    handleRowClick = (evt) => {
        let { servers } = this.props;
        let { disablingServerIDs, restoringServerIDs } = this.state;
        let serverID = parseInt(evt.currentTarget.getAttribute('data-server-id'));
        let server = _.find(servers, { id: serverID });
        if (server.deleted || server.disabled) {
            if (_.includes(restoringServerIDs, server.id)) {
                restoringServerIDs = _.without(restoringServerIDs, server.id);
            } else {
                restoringServerIDs = _.concat(restoringServerIDs, server.id);
            }
        } else {
            if (_.includes(disablingServerIDs, server.id)) {
                disablingServerIDs = _.without(disablingServerIDs, server.id);
            } else {
                disablingServerIDs = _.concat(disablingServerIDs, server.id);
            }
        }
        let hasChanges = !_.isEmpty(restoringServerIDs) || !_.isEmpty(disablingServerIDs);
        this.setState({ restoringServerIDs, disablingServerIDs, hasChanges });
    }
}

let filterServers = memoizeWeak(null, function(servers) {
    return _.filter(servers, (server) => {
        return !server.deleted && !server.disabled;
    });
});

let sortServers = memoizeWeak(null, function(servers, users, env, columns, directions) {
    let { t, p } = env.locale;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (server) => {
                    return p(server.details.title) || t(`server-type-${server.type}`);
                };
            case 'type':
                return (server) => {
                    return t(`server-type-${server.type}`);
                };
            case 'users':
                return (server) => {
                    return _.size(findUsers(users, server));
                };
            default:
                return column;
        }
    });
    return _.orderBy(servers, columns, directions);
});

function getServerIcon(type) {
    switch (type) {
        case 'facebook':
            return 'facebook-official';
        default:
            return type;
    }
}

function hasOAuthCredentials(server) {
    let oauth = server.settings.oauth;
    if (oauth) {
        if (oauth.client_id && oauth.client_secret) {
            return true;
        }
    }
    return false;
}

function hasAPICredentials(server) {
    let api = server.settings.api;
    if (api) {
        if (api.access_token) {
            return true;
        }
    }
    return false;
}

let findUsers = memoizeWeak(null, function(users, server) {
    return _.filter(users, (user) => {
        return _.some(user.external, (link) => {
            if (link.server_id === server.id) {
                return true;
            }
        });
    });
});

export {
    ServerListPage as default,
    ServerListPage,
    ServerListPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ServerListPage.propTypes = {
        editing: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    ServerListPageSync.propTypes = {
        editing: PropTypes.bool,
        servers: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
