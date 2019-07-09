import _ from 'lodash';
import React from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as WikiFinder from 'common/objects/finders/wiki-finder.mjs';
import * as WikiSaver from 'common/objects/savers/wiki-saver.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { ActionBadge } from '../widgets/action-badge.jsx';
import { ModifiedTimeTooltip } from '../tooltips/modified-time-tooltip.jsx'
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

import './wiki-list-page.scss';

async function WikiListPage(props) {
    const { database, route, env, projectID, editing } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const project = await ProjectFinder.findProject(database, projectID);
    const schema = project.name;
    const wikis = await WikiFinder.findAllWikis(database, schema);
    render();
    const repos = await RepoFinder.findProjectRepos(database, [ project ]);
    render();

    function render() {
        const sprops = { project, wikis, repos };
        show(<WikiListPageSync {...sprops} {...props} />);
    }
}

function WikiListPageSync(props) {
    const { schema, project, wikis, repos } = props;
    const { database, route, env, editing } = props;
    const { t, p, f } = env.locale;
    const readOnly = !editing;
    const publicWikis = filterWikis(wikis, false);
    const chosenWikis = filterWikis(wikis, true);
    const selection = useSelectionBuffer({
        original: chosenWikis,
        reset: readOnly,
    });
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();
    const warnDataLoss = useDataLossWarning(route, env, confirm);

    const [ sort, handleSort ] = useSortHandler();
    const handleRowClick = useRowToggle(selection, wikis);
    const handleEditClick = useListener((evt) => {
        route.replace({ editing: true });
    });
    const handleCancelClick = useListener((evt) => {
        route.replace({ editing: undefined });
    });
    const handleSaveClick = async (evt) => {
        run(async () => {
            const removing = selection.removing();
            if (removing.length > 0) {
                await confirm(t('wiki-list-confirm-disable-$count', removing.length));
            }
            const adding = selection.adding();
            if (adding.length > 0) {
                await confirm(t('wiki-list-confirm-reactivate-$count', adding.length));
            }
            await WikiSaver.disableWikis(database, schema, removing);
            await WikiSaver.restoreWikis(database, schema, adding);
            warnDataLoss(false);
            handleCancelClick();
        });
    };

    warnDataLoss(selection.changed);

    return (
        <div className="wiki-list-page">
            {renderButtons()}
            <h2>{t('wiki-list-title')}</h2>
            <UnexpectedError error={error} />
            {renderTable()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            return (
                <div key="view" className="buttons">
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('wiki-list-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const { changed } = selection;
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('wiki-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('wiki-list-save')}
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
                {renderSlugColumn()}
                {renderRepoColumn()}
                {renderModifiedTimeColumn()}
            </tr>
        );
    }

    function renderRows() {
        const visible = (selection.shown) ? wikis : publicWikis;
        const sorted = sortWikis(wikis, env, sort);
        return _.map(sorted, renderRow);
    }

    function renderRow(wiki) {
        const classNames = [];
        let title, onClick;
        if (wiki.public && !wiki.chosen) {
            classNames.push('referenced');
            title = t('wiki-list-status-referenced');
        }
        if (selection.shown) {
            if (selection.isExisting(wiki) || wiki.public) {
                classNames.push('fixed');
            }
            if (selection.isKeeping(wiki)) {
                classNames.push('selected');
            }
            onClick = handleRowClick;
        }
        const props = {
            className: classNames.join(' '),
            'data-id': wiki.id,
            onClick,
            title,
        };
        return (
            <tr key={wiki.id} {...props}>
                {renderTitleColumn(wiki)}
                {renderSlugColumn(wiki)}
                {renderRepoColumn(wiki)}
                {renderModifiedTimeColumn(wiki)}
            </tr>
        );
    }

    function renderTitleColumn(wiki) {
        if (!wiki) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            const name = _.get(wiki, 'details.title', '');
            let url, badge;
            if (selection.shown) {
                if (selection.isAdding(wiki)) {
                    badge = <ActionBadge type="select" env={env} />;
                } else if (selection.isRemoving(wiki)) {
                    badge = <ActionBadge type="deselect" env={env} />;
                }
            } else {
                // don't create the link when we're editing the list
                const params = { ...route.params, wikiID: wiki.id };
                url = route.find('wiki-summary-page', params);
            }
            return (
                <td>
                    <a href={url}>{name}</a>{badge}
                </td>
            );
        }
    }

    function renderSlugColumn(wiki) {
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!wiki) {
            return <TH id="url">{t('table-heading-slug')}</TH>;
        } else {
            return <td>{wiki.url}</td>;
        }
    }

    function renderRepoColumn(wiki) {
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!wiki) {
            return <TH id="url">{t('table-heading-repo')}</TH>;
        } else {
            return <td>{wiki.repo_id}</td>;
        }
    }

    function renderModifiedTimeColumn(wiki) {
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!wiki) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            const props = {
                time: wiki.mtime,
                disabled: selection.shown,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }
}

const sortWikis = memoizeWeak(null, function(wikis, env, sort) {
    const columns = _.map(sort.columns, (column) => {
        switch (column) {
            case 'title':
                return 'details.title';
            default:
                return column;
        }
    });
    return _.orderBy(wikis, columns, sort.directions);
});

const filterWikis = memoizeWeak(null, function(wikis, chosen) {
    return _.filter(wikis, (wiki) => {
        if (wiki.public) {
            return wiki.chosen || !chosen;
        }
    });
});

const component = Relaks.memo(WikiListPage);

export {
    component as default,
    component as WikiListPage,
};
