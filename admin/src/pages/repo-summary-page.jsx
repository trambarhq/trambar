import _ from 'lodash';
import React, { useState, useCallback } from 'react';
import Relaks, { useProgress, useSaveBuffer } from 'relaks';
import { useEditHandling, useReturnHandling, useConfirmation } from '../hooks.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { ActivityChart } from '../widgets/activity-chart.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { DataLossWarning } from '../widgets/data-loss-warning.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './repo-summary-page.scss';

async function RepoSummaryPage(props) {
    const { database, route, env, projectID, repoID, editing } = props;
    const { t, p } = env.locale;
    const db = database.use({ schema: 'global', by: this });
    const readOnly = !editing;
    const [ problems, setProblems ] = useState({});
    const [ confirmationRef, confirm ] = useConfirmation();
    const [ show ] = useProgress();
    const draft = useSaveBuffer({
        save: (base, ours, action) => {
            switch (action) {
                case 'restore': return restore(base);
                default: return save(base, ours);
            }
        },
        remove,
        compare: _.isEqual,
        reset: !editing,
    });

    const [ handleEditClick, handleCancelClick ] = useEditHandling(route);
    const [ handleReturnClick ] = useReturnHandling(route, {
        page: 'repo-list-page',
    });
    const handleRemoveClick = useCallback(async (evt) => {
        await draft.remove();
    });
    const handleRestoreClick = useCallback(async (evt) => {
        await draft.save('restore');
    });
    const handleSaveClick = useCallback(async (evt) => {
        await draft.save();
    });
    const handleTitleChange = useCallback((evt) => {
        const title = evt.target.value;
        draft.set(_.decoupleSet(draft.current, 'details.title', title));
    });

    render();
    const currentUserID = await db.start()
    const system = await SystemFinder.findSystem(db);
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    const repo = await RepoFinder.findRepo(db, repoID);
    render();
    const project = await ProjectFinder.findProject(db, projectID);
    render();
    const statistics = await StatisticsFinder.findDailyActivitiesOfRepo(db, project, repo);
    render();

    function render() {
        const { changed } = draft;
        const title = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
        show(
            <div className="repo-summary-page">
                {renderButtons()}
                <h2>{t('repo-summary-$title', title)}</h2>
                <UnexpectedError error={draft.error} />
                {renderForm()}
                {renderInstructions()}
                {renderChart()}
                <ActionConfirmation ref={confirmationRef} env={env} />
                <DataLossWarning changes={changed} env={env} route={route} />
            </div>
        );
    }

    function renderButtons() {
        const { changed } = draft;
        if (editing) {
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('repo-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('repo-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            const active = (project && repo) ? _.includes(project.repo_ids, repo.id) : true;
            const preselected = (!active) ? 'restore' : undefined;
            return (
                <div key="view" className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={handleReturnClick}>
                            {t('repo-summary-return')}
                        </option>
                        <option name="remove" disabled={!active} onClick={handleRemoveClick}>
                            {t('repo-summary-remove')}
                        </option>
                        <option name="restore" hidden={active} onClick={handleRestoreClick}>
                            {t('repo-summary-restore')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('repo-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    }

    function renderForm() {
        return (
            <div className="form">
                {renderTitleInput()}
                {renderNameInput()}
                {renderIssueTrackingStatus()}
            </div>
        );
    }

    function renderTitleInput() {
        const props = {
            id: 'title',
            value: _.get(draft.current, 'details.title', {}),
            availableLanguageCodes,
            readOnly,
            env,
            onChange: handleTitleChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('repo-summary-title')}
            </MultilingualTextField>
        );
    }

    function renderNameInput() {
        const props = {
            id: 'name',
            value: _.get(draft.current, 'name', ''),
            readOnly,
            env,
        };
        return (
            <TextField {...props}>
                {t('repo-summary-gitlab-name')}
            </TextField>
        );
    }

    function renderIssueTrackingStatus() {
        const status = _.get(draft.current, 'details.issues_enabled') ? 'enabled' : 'disabled';
        const props = {
            id: 'issue-tracker',
            value: t(`repo-summary-issue-tracker-${status}`),
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('repo-summary-issue-tracker')}
            </TextField>
        );
    }

    function renderInstructions() {
        const instructionProps = {
            folder: 'repo',
            topic: 'repo-summary',
            hidden: !editing,
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }

    function renderChart() {
        const chartProps = {
            statistics,
            env,
        };
        return (
            <div className="statistics">
                <ErrorBoundary env={env}>
                    <ActivityChart {...chartProps}>
                        {t('repo-summary-statistics')}
                    </ActivityChart>
                </ErrorBoundary>
            </div>
        );
    }

    async function remove(base) {
        await confirm(t('repo-summary-confirm-remove'));

        const repoIDs = _.difference(project.repo_ids, [ base.id ]);
        const changes = {
            id: project.id,
            repo_ids: repoIDs
        };
        await db.saveOne({ table: 'project' }, changes);
        handleReturnClick();
    }

    async function restore(base) {
        await confirm(t('repo-summary-confirm-restore'));

        const repoIDs = _.union(project.repo_ids, [ base.id ]);
        const changes = {
            id: project.id,
            repo_ids: repoIDs
        };
        await db.saveOne({ table: 'project' }, changes);
    }

    async function save(base, ours) {
        setSaving(true);
        try {
            const repoAfter = await db.saveOne({ table: 'repo' }, ours);
            handleCancelClick();
            return repoAfter;
        } finally {
            setSaving(false);
        }
    }
}

const component = Relaks.memo(RepoSummaryPage);

export {
    component as default,
    component as RepoSummaryPage,
};
