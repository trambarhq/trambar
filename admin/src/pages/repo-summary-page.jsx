import _ from 'lodash';
import React, { useState } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
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
import { UnexpectedError } from '../widgets/unexpected-error.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

// custom hooks
import {
    useDraftBuffer,
    useConfirmation,
} from '../hooks.mjs';

import './repo-summary-page.scss';

async function RepoSummaryPage(props) {
    const { database, projectID, repoID } = props;
    const [ show ] = useProgress();

    render();
    const db = database.use({ schema: 'global' });
    const currentUserID = await db.start()
    const system = await SystemFinder.findSystem(db);
    const repo = await RepoFinder.findRepo(db, repoID);
    render();
    const project = await ProjectFinder.findProject(db, projectID);
    render();
    const statistics = await StatisticsFinder.findDailyActivitiesOfRepo(db, project, repo);
    render();

    function render() {
        const sprops = { system, repo, project, statistics };
        return <RepoSummaryPageSync {...sprops} {...props} />;
    }
}

async function RepoSummaryPage(props) {
    const { system, repo, project, statistics } = props;
    const { database, route, env, editing } = props;
    const { t, p } = env.locale;
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    const readOnly = !editing;
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();
    const [ show ] = useProgress();
    const draft = useDraftBuffer(editing, {
        original: repo,
        save: saveRepo,
    });

    const handleEditClick = useListener((evt) => {
        route.push({ editing: true });
    });
    const handleCancelClick = useListener((evt) => {
        route.push({ editing: undefined });
    });
    const handleReturnClick = useListener((evt) => {
        route.push('repo-list-page', { projectID: project.id });
    });
    const handleRemoveClick = useListener(async (evt) => {
        await run(removeRepo);
    });
    const handleRestoreClick = useListener(async (evt) => {
        await run(restoreRepo);
    });
    const handleSaveClick = useListener(async (evt) => {
        await run(draft.save);
    });
    const handleTitleChange = useListener((evt) => {
        const title = evt.target.value;
        draft.update('details.title', title);
    });

    const { changed } = draft;
    const title = p(_.get(repo, 'details.title')) || _.get(repo, 'name');
    return (
        <div className="repo-summary-page">
            {renderButtons()}
            <h2>{t('repo-summary-$title', title)}</h2>
            <UnexpectedError error={error} />
            {renderForm()}
            {renderInstructions()}
            {renderChart()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
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
        } else {
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
            value: draft.get('details.title', {}),
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
            value: draft.get('name', ''),
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
        const status = draft.get('details.issues_enabled') ? 'enabled' : 'disabled';
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
        const chartProps = { statistics, env };
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

    async function removeRepo() {
        await confirm(t('repo-summary-confirm-remove'));

        const repoIDs = _.difference(project.repo_ids, [ repo.id ]);
        const changes = {
            id: project.id,
            repo_ids: repoIDs
        };
        await db.saveOne({ table: 'project' }, changes);
    }

    async function restoreRepo() {
        await confirm(t('repo-summary-confirm-restore'));

        const repoIDs = _.union(project.repo_ids, [ repo.id ]);
        const changes = {
            id: project.id,
            repo_ids: repoIDs
        };
        await db.saveOne({ table: 'project' }, changes);
    }

    async function saveRepo(base, ours) {
        const repoAfter = await db.saveOne({ table: 'repo' }, ours);
        return repoAfter;
    }
}

const component = Relaks.memo(RepoSummaryPage);

export {
    component as default,
    component as RepoSummaryPage,
};
