import _ from 'lodash';
import Moment from 'moment';
import React, { useRef, useCallback } from 'react';
import Relaks, { useProgress } from 'relaks';
import { useSelectionBuffer, useSortHandling, useEditToggle, useErrorHandling } from '../hooks.mjs';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ServerFinder from 'common/objects/finders/server-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { UserTooltip } from '../tooltips/user-tooltip.jsx';
import { ModifiedTimeTooltip } from '../tooltips/modified-time-tooltip.jsx'
import { ActionBadge } from '../widgets/action-badge.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { DataLossWarning } from '../widgets/data-loss-warning.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

import './server-list-page.scss';

async function ServerListPage(props) {
    const { database, route, env, editing } = props;
    const { t, p, f } = env.locale;
    const [ show ] = useProgress();
    const selection = useSelectionBuffer(editing);
    const confirmation = useRef();
    const db = database.use({ schema: 'global', by: this });

    const [ sort, handleSort ] = useSortHandling();
    const [ problems, setProblems, setUnexpectedError ] = useErrorHandling();
    const [ handleEditClick, handleCancelClick, handleAddClick ] = useEditToggle(route, {
        page: 'server-summary-page',
        params: { serverID: 'new' },
    });
    const handleSaveClick = useCallback(async (evt) => {
        try {
            setProblems({});
            await saveSelection();
            handleCancelClick();
        } catch (err) {
            setUnexpectedError(err);
        }
    }, [ saveSelection, handleCancelClick ]);
    const handleRowClick = useCallback((evt) => {
        const serverID = parseInt(evt.currentTarget.getAttribute('data-server-id'));
        selection.toggle(serverID);
    });

    render();
    const currentUserID = await db.start();
    const servers = await ServerFinder.findAllServers(db);
    const activeServers = filterServers(servers);
    selection.base(_.map(activeServers, 'id'));
    render();
    const users = await UserFinder.findActiveUsers(db);
    render();

    function render() {
        const { changed } = selection;
        show(
            <div className="server-list-page">
                {renderButtons()}
                <h2>{t('server-list-title')}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {renderTable()}
                <ActionConfirmation ref={confirmation} env={env} />
                <DataLossWarning changes={changed} env={env} route={route} />
            </div>
        );
    }

    function renderButtons() {
        const { changed } = selection;
        if (editing) {
            return (
                <div className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('server-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('server-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            const preselected = 'add';
            const empty = _.isEmpty(servers);
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="add" onClick={handleAddClick}>
                            {t('server-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton name="edit" className="emphasis" disabled={empty} onClick={handleEditClick}>
                        {t('server-list-edit')}
                    </PushButton>
                </div>
            );
        }
    }

    function renderTable() {
        const tableProps = {
            sortColumns: sort.columns,
            sortDirections: sort.directions,
            onSort: handleSort,
        };
        if (selection.shown) {
            tableProps.expandable = true;
            tableProps.selectable = true;
            tableProps.expanded = !!editing;
            tableProps.onClick = handleRowClick;
        }
        return (
            <SortableTable {...tableProps}>
                <thead>{renderHeadings()}</thead>
                <tbody>{renderRows()}</tbody>
            </SortableTable>
        );
    }

    function renderHeadings() {
        return (
            <tr>
                {renderTitleColumn()}
                {renderTypeColumn()}
                {renderOAuthColumn()}
                {renderAPIColumn()}
                {renderUsersColumn()}
                {renderModifiedTimeColumn()}
            </tr>
        );
    }

    function renderRows() {
        const visible = (selection.shown) ? servers : activeServers;
        const sorted = sortServers(visible, users, env, sort);
        return _.map(sorted, renderRow);
    }

    function renderRow(server) {
        const classNames = [];
        let onClick, title;
        if (server.deleted) {
            classNames.push('deleted');
            title = t('server-list-status-deleted');
        } else if (server.disabled) {
            classNames.push('disabled');
            title = t('server-list-status-disabled');
        }
        if (selection.shown) {
            if (selection.existing(server.id)) {
                classNames.push('fixed');
            }
            if (selection.keeping(server.id) || selection.adding(server.id)) {
                classNames.push('selected');
            }
            onClick = handleRowClick;
        }
        const props = {
            className: classNames.join(' '),
            'data-server-id': server.id,
            title,
            onClick,
        };
        return (
            <tr key={server.id} {...props}>
                {renderTitleColumn(server)}
                {renderTypeColumn(server)}
                {renderOAuthColumn(server)}
                {renderAPIColumn(server)}
                {renderUsersColumn(server)}
                {renderModifiedTimeColumn(server)}
            </tr>
        );
    }

    function renderTitleColumn(server) {
        if (!server) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            const title = p(server.details.title) || t(`server-type-${server.type}`);
            let url, badge;
            if (selection.shown) {
                if (selection.adding(server.id)) {
                    badge = <ActionBadge type="reactivate" env={env} />;
                } else if (selection.removing(server.id)) {
                    badge = <ActionBadge type="disable" env={env} />;
                }
            } else {
                const params = { serverID: server.id };
                url = route.find('server-summary-page', params);
            }
            const iconName = getServerIcon(server.type);
            const icon = <i className={`fa fa-${iconName} fa-fw`} />;
            return (
                <td>
                    <a href={url}>{icon} {title}</a>{badge}
                </td>
            );
        }
    }

    function renderTypeColumn(server) {
        if (!server) {
            return <TH id="type">{t('table-heading-type')}</TH>;
        } else {
            return <td>{t(`server-type-${server.type}`)}</td>
        }
    }

    function renderOAuthColumn(server) {
        if (!env.isWiderThan('wide')) {
            return null;
        }
        if (!server) {
            return <TH id="oauth">{t('table-heading-oauth')}</TH>;
        } else {
            const active = hasOAuthCredentials(server);
            return <td>{t(`server-list-oauth-${active}`)}</td>
        }
    }

    function renderAPIColumn(server) {
        if (!env.isWiderThan('wide')) {
            return null;
        }
        if (!server) {
            return <TH id="api">{t('table-heading-api-access')}</TH>;
        } else {
            const active = hasAPICredentials(server);
            return <td>{t(`server-list-api-access-${active}`)}</td>
        }
    }

    function renderUsersColumn(server) {
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!server) {
            return <TH id="users">{t('table-heading-users')}</TH>;
        } else {
            const props = {
                users: findUsers(users, server),
                route,
                env,
            };
            return <td><UserTooltip {...props} /></td>;
        }
    }

    function renderModifiedTimeColumn(server) {
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!server) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            const props = {
                time: server.mtime,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }

    async function saveSelection() {
        const { ask } = confirmation.current;
        const { adding, removing } = selection.current;

        if (!_.isEmpty(removing)) {
            const question = t('server-list-confirm-disable-$count', removing.length);
            const confirmed = await ask(question);
            if (!confirmed) {
                return;
            }
        }
        if (!_.isEmpty(adding)) {
            const question = t('server-list-confirm-reactivate-$count', adding.length);
            const confirmed = await ask(question);
            if (!confirmed) {
                return;
            }
        }

        const changes = [];
        for (let server of servers) {
            const columns = { id: server.id };
            if (_.includes(removing, server.id)) {
                columns.disabled = true;
            } else if (_.includes(adding, server.id)) {
                columns.disabled = flags.deleted = false;
            } else {
                continue;
            }
            changes.push(columns);
        }
        const serversAfter = await db.save({ table: 'server' }, changes);
        return serversAfter;
    }
}

const filterServers = memoizeWeak(null, function(servers) {
    return _.filter(servers, (server) => {
        return !server.deleted && !server.disabled;
    });
});

const sortServers = memoizeWeak(null, function(servers, users, env, sort) {
    const { t, p } = env.locale;
    const columns = _.map(sort.columns, (column) => {
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
            case 'api':
                return (server) => {
                    return hasAPICredentials(server);
                };
            default:
                return column;
        }
    });
    return _.orderBy(servers, columns, sort.directions);
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
    if (server && server.settings) {
        const oauth = server.settings.oauth;
        if (oauth) {
            if (oauth.client_id && oauth.client_secret) {
                return true;
            }
        }
    }
    return false;
}

function hasAPICredentials(server) {
    if (server && server.settings) {
        const api = server.settings.api;
        if (api) {
            if (api.access_token) {
                return true;
            }
        }
    }
    return false;
}

const findUsers = memoizeWeak(null, function(users, server) {
    return _.filter(users, (user) => {
        return _.some(user.external, (link) => {
            if (link.server_id === server.id) {
                return true;
            }
        });
    });
});

const component = Relaks.memo(ServerListPage);

export {
    component as default,
    component as ServerListPage,
};
