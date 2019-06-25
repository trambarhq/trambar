import _ from 'lodash';
import React, { useState } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectSaver from 'common/objects/savers/project-saver.mjs';
import * as ProjectSettings from 'common/objects/settings/project-settings.mjs';
import * as ProjectUtils from 'common/objects/utils/project-utils.mjs';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { ImageSelector } from '../widgets/image-selector.jsx';
import { ActivityChart } from '../widgets/activity-chart.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

// custom hooks
import {
    useDraftBuffer,
    useAutogenID,
    useValidation,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './project-summary-page.scss';

async function ProjectSummaryPage(props) {
    const { database, route, env, payloads, projectID, editing } = props;
    const creating = (projectID === 'new');
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const system = await SystemFinder.findSystem(database);
    render();
    const project = (!creating) ? await ProjectFinder.findProject(database, projectID) : null;
    render();
    const statistics = (!creating) ? await StatisticsFinder.findDailyActivitiesOfProject(database, project) : null;
    render();

    function render() {
        const sprops = { system, project, statistics, creating };
        show (<ProjectSummaryPageSync key={projectID} {...sprops} {...props} />);
    }
}

function ProjectSummaryPageSync(props) {
    const { system, project, statistics } = props;
    const { database, route, env, payloads, editing, creating } = props;
    const { t, p } = env.locale;
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    const readOnly = !(editing || creating);
    const [ adding, setAdding ] = useState(false);
    const draft = useDraftBuffer({
        original: project || {},
        reset: readOnly,
    });
    const [ error, run ] = useErrorCatcher();
    const [ problems, reportProblems ] = useValidation();
    const [ confirmationRef, confirm ] = useConfirmation();
    const warnDataLoss = useDataLossWarning(route, env, confirm);

    const handleEditClick = useListener((evt) => {
        route.replace({ editing: true });
    });
    const handleCancelClick = useListener((evt) => {
        route.replace({ editing: undefined });
    });
    const handleAddClick = useListener((evt) => {
        route.push({ editing: true, projectID: 'new' });
    });
    const handleReturnClick = useListener((evt) => {
        route.push('project-list-page');
    });
    const handleArchiveClick = useListener((evt) => {
        run(async () => {
            await confirm(t('project-summary-confirm-archive'));
            await ProjectSaver.archiveProject(database, project);
            handleReturnClick();
        });
    });
    const handleRemoveClick = useListener((evt) => {
        run(async () => {
            await confirm(t('project-summary-confirm-delete'));
            await ProjectSaver.removeProject(database, project);
            handleReturnClick();
        });
    });
    const handleRestoreClick = useListener((evt) => {
        run(async () => {
            await confirm(t('project-summary-confirm-restore'));
            await ProjectSaver.restoreProject(database, project);
        });
    });
    const handleSaveClick = useListener((evt) => {
        run(async () => {
            try {
                const problems = {};
                const reservedNames = [ 'global', 'admin', 'public', 'srv' ];
                const name = draft.get('name');
                if (!name) {
                    problems.name = 'validation-required';
                } else if (_.includes(reservedNames, name)) {
                    problems.name = 'validation-illegal-project-name';
                }
                reportProblems(problems);

                const projectAfter = await ProjectSaver.saveProject(database, draft.current);
                payloads.dispatch(projectAfter);
                if (creating) {
                    setAdding(true);
                }
                warnDataLoss(false);
                route.replace({ editing: undefined, projectID: projectAfter.id });
            } catch (err) {
                if (err.statusCode === 409) {
                    reportProblems({ name: 'validation-duplicate-project-name' });
                } else {
                    throw err;
                }
            }
        });
    });
    const [ handleTitleChange, handleNameChange ] = useAutogenID(draft, {
        titleKey: 'details.title',
        nameKey: 'name',
    });
    const handleDescriptionChange = useListener((evt) => {
        const description = evt.target.value;
        draft.set('details.description', description);
    });
    const handleEmblemChange = useListener((evt) => {
        const resources = evt.target.value;
        draft.set('details.resources', resources);
    });
    const handleMembershipOptionClick = useListener((evt) => {
        const optsBefore = draft.get('settings.membership', {});
        const opts = toggleOption(optsBefore, membershipOptions, evt.name);
        draft.set('settings.membership', opts);
    });
    const handleAccessControlOptionClick = useListener((evt) => {
        const optsBefore = draft.get('settings.access_control', {});
        const opts = toggleOption(optsBefore, accessControlOptions, evt.name);
        draft.set('settings.access_control', opts);
    });

    warnDataLoss(draft.changed);

    const title = ProjectUtils.getDisplayName(draft.current, env);
    return (
        <div className="project-summary-page">
            {renderButtons()}
            <h2>{t('project-summary-$title', title)}</h2>
            <UnexpectedError error={error} />
            {renderForm()}
            {renderInstructions()}
            {renderChart()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            // using keys here to force clearing of focus
            const active = (project) ? !project.deleted && !project.archived : true;
            let preselected;
            if (active) {
                preselected = (adding) ? 'add' : 'return';
            } else {
                preselected = 'restore';
            }
            return (
                <div key="view" className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={handleReturnClick}>
                            {t('project-summary-return')}
                        </option>
                        <option name="add" onClick={handleAddClick}>
                            {t('project-summary-add')}
                        </option>
                        <option name="archive" disabled={!active} separator onClick={handleArchiveClick}>
                            {t('project-summary-archive')}
                        </option>
                        <option name="delete" disabled={!active} onClick={handleRemoveClick}>
                            {t('project-summary-delete')}
                        </option>
                        <option name="restore" hidden={active} onClick={handleRestoreClick}>
                            {t('project-summary-restore')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('project-summary-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const { changed } = draft;
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('project-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('project-summary-save')}
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
                {renderDescriptionInput()}
                {renderEmblemSelector()}
                {renderMembershipOptions()}
                {renderAccessControlOptions()}
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
                {t('project-summary-title')}
            </MultilingualTextField>
        );
    }

    function renderNameInput() {
        const props = {
            id: 'name',
            value: draft.get('name', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleNameChange,
        };
        return (
            <TextField {...props}>
                {t('project-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    }

    function renderDescriptionInput() {
        const props = {
            id: 'description',
            type: 'textarea',
            value: draft.get('details.description', {}),
            availableLanguageCodes,
            readOnly,
            env,
            onChange: handleDescriptionChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('project-summary-description')}
            </MultilingualTextField>
        );
    }

    function renderEmblemSelector() {
        const props = {
            purpose: 'project-emblem',
            desiredWidth: 500,
            desiredHeight: 500,
            resources: draft.get('details.resources', []),
            readOnly,
            database,
            env,
            payloads,
            onChange: handleEmblemChange,
        };
        return (
            <ImageSelector {...props}>
                {t('project-summary-emblem')}
            </ImageSelector>
        );
    }

    function renderMembershipOptions() {
        let listProps = {
            readOnly,
            onOptionClick: handleMembershipOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('project-summary-new-members')}</label>
                {_.map(membershipOptions, renderMembershipOption)}
            </OptionList>
        );
    }

    function renderMembershipOption(option, i) {
        const optsCurr = draft.getCurrent('settings.membership', {});
        const optsPrev = draft.getOriginal('settings.membership', {});
        return renderOption(option, optsCurr, optsPrev, i);
    }

    function renderOption(option, optsCurr, optsPrev, i) {
        const noneCurr = !_.some(optsCurr);
        const nonePrev = (creating) ? !_.some(optsPrev) : undefined;
        const props = {
            name: option.name,
            selected: (option.none) ? noneCurr : optsCurr[option.name],
            previous: (option.none) ? nonePrev : optsPrev[option.name],
            hidden: option.shownIf && !optsCurr[option.shownIf],
        };
        return <option key={i} {...props}>{t(option.label)}</option>;
    }

    function renderAccessControlOptions() {
        const listProps = {
            readOnly,
            onOptionClick: handleAccessControlOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('project-summary-access-control')}</label>
                {_.map(accessControlOptions, renderAccessControlOption)}
            </OptionList>
        );
    }

    function renderAccessControlOption(option, i) {
        const optsCurr = draft.getCurrent('settings.access_control', {});
        const optsPrev = draft.getOriginal('settings.access_control', {});
        return renderOption(option, optsCurr, optsPrev, i);
    }

    function renderInstructions() {
        const props = {
            folder: 'project',
            topic: 'project-summary',
            hidden: readOnly,
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...props} />
            </div>
        );
    }

    function renderChart() {
        if (creating) {
            return null;
        }
        const props = { statistics, env };
        return (
            <div className="statistics">
                <ErrorBoundary env={env}>
                    <ActivityChart {...props}>
                        {t('project-summary-statistics')}
                    </ActivityChart>
                </ErrorBoundary>
            </div>
        );
    }
}

function toggleOption(optsBefore, list, name) {
    const option = _.find(list, { name });
    let opts;
    if (option.none) {
        opts = {};
    } else {
        opts = { ...optsBefore };
        if (opts[option.name]) {
            delete opts[option.name];
            for (let depOption of list) {
                if (depOption.shownIf === option.name) {
                    delete opts[depOption.name];
                }
            }
        } else {
            opts[option.name] = true;
        }
    }
    return opts;
}

const membershipOptions = [
    {
        name: 'manual',
        label: 'project-summary-new-members-manual',
        none: true
    },
    {
        name: 'allow_user_request',
        label: 'project-summary-new-members-join-user'
    },
    {
        name: 'approve_user_request',
        label: 'project-summary-new-members-auto-accept-user',
        shownIf: 'allow_user_request'
    },
    {
        name: 'allow_guest_request',
        label: 'project-summary-new-members-join-guest'
    },
    {
        name: 'approve_guest_request',
        label: 'project-summary-new-members-auto-accept-guest',
        shownIf: 'allow_guest_request'
    },
];
const accessControlOptions = [
    {
        name: 'members_only',
        label: 'project-summary-access-control-member-only',
        none: true
    },
    {
        name: 'grant_view_access',
        label: 'project-summary-access-control-non-member-view'
    },
    {
        name: 'grant_comment_access',
        label: 'project-summary-access-control-non-member-comment',
        shownIf: 'grant_view_access'
    },
];

const component = Relaks.memo(ProjectSummaryPage);

export {
    component as default,
    component as ProjectSummaryPage,
};
