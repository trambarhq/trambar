import _ from 'lodash';
import Moment from 'moment';
import React, { useRef } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ServerFinder from 'common/objects/finders/server-finder.mjs';
import * as ServerSaver from 'common/objects/savers/server-saver.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { UserTooltip } from '../tooltips/user-tooltip.jsx';
import { ModifiedTimeTooltip } from '../tooltips/modified-time-tooltip.jsx'
import { ActionBadge } from '../widgets/action-badge.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

// custom hooks
import {
    useSelectionBuffer,
    useSortHandler,
    useRowToggle,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './server-list-page.scss';

async function ServerListPage(props) {
    const { database } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const servers = await ServerFinder.findAllServers(database);
    render();
    const users = await UserFinder.findActiveUsers(database);
    render();

    function render() {
        const sprops = { servers, users };
        show(<ServerListPageSync {...sprops} {...props} />);
    }
}

function ServerListPageSync(props) {
    const { servers, users } = props;
    const { database, route, env, editing } = props;
    const { t, p, f } = env.locale;
    const readOnly = !editing;
    const activeServers = filterServers(servers);
    const selection = useSelectionBuffer({
        original: _.map(activeServers, 'id'),
        reset: readOnly,
    });
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();
    const warnDataLoss = useDataLossWarning(route, env, confirm);

    const [ sort, handleSort ] = useSortHandler();
    const handleRowClick = useRowToggle(selection, 'data-server-id');
    const handleEditClick = useListener((evt) => {
        route.replace({ editing: true });
    });
    const handleCancelClick = useListener((evt) => {
        route.replace({ editing: undefined });
    });
    const handleAddClick = useListener((evt) => {
        route.push('server-summary-page', { serverID: 'new' });
    });
    const handleSaveClick = useListener((evt) => {
        run(async () => {
            const removal = selection.filter(servers, 'removing');
            const addition = selection.filter(servers, 'adding');
            if (removal.length > 0) {
                await confirm(t('server-list-confirm-disable-$count', removal.length));
            }
            if (addition.length > 0) {
                await confirm(t('server-list-confirm-reactivate-$count', addition.length));
            }
            await ServerSaver.disableServers(database, removal);
            await ServerSaver.restoreServers(database, addition);
            warnDataLoss(false);
            handleCancelClick();
        });
    });

    warnDataLoss(selection.changed);

    return (
        <div className="server-list-page">
            {renderButtons()}
            <h2>{t('server-list-title')}</h2>
            <UnexpectedError error={error} />
            {renderTable()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
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
        } else {
            const { changed } = selection;
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
            tableProps.expanded = !readOnly;
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
                disabled: selection.shown,
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
                disabled: selection.shown,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
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
