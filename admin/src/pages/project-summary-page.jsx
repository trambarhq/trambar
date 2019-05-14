import _ from 'lodash';
import React, { useState, useCallback } from 'react';
import Relaks, { useProgress, useSaveBuffer, Cancellation } from 'relaks';
import { useEditHandling, useAddHandling, useReturnHandling, useConfirmation } from '../hooks.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectSettings from 'common/objects/settings/project-settings.mjs';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';
import * as SlugGenerator from 'common/utils/slug-generator.mjs';

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
import { DataLossWarning } from '../widgets/data-loss-warning.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './project-summary-page.scss';

async function ProjectSummaryPage(props) {
    const { database, route, env, payloads, projectID, editing } = props;
    const { t, p } = env.locale;
    const db = database.use({ schema: 'global', by: this });
    const creating = (projectID === 'new');
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
        remove: (base, ours, action) => {
            switch (action) {
                case 'archive': return archive(base);
                default: return remove(base);
            }
        },
        compare: _.isEqual,
        reset: !editing,
    });

    const [ handleEditClick, handleCancelClick ] = useEditHandling(route);
    const [ handleAddClick ] = useAddHandling(route, {
        params: { projectID: 'new' },
    });
    const [ handleReturnClick ] = useReturnHandling(route, {
        page: 'project-list-page',
    });
    const handleArchiveClick = useCallback(async (evt) => {
        await draft.remove('archive');
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
        let after = _.decoupleSet(draft.current, 'details.title', title);

        // derive name from title
        const titleBefore = _.get(draft.current, 'details.title', {});
        const autoNameBefore = SlugGenerator.fromTitle(titleBefore);
        const autoName = SlugGenerator.fromTitle(title);
        const nameBefore = _.get(draft.current, 'name', '');
        if (!nameBefore || nameBefore === autoNameBefore) {
            after = _.decoupleSet(after, 'name', autoName);
        }
        draft.set(after);
    });
    const handleNameChange = useCallback((evt) => {
        const name = evt.target.value;
        const nameTransformed = _.toLower(name).replace(/[^\w\-]+/g, '');
        const nameLimited = nameTransformed.substr(0, 128);
        draft.set(_.decoupleSet(draft.current, 'name', nameLimited));
    });
    const handleDescriptionChange = useCallback((evt) => {
        const description = evt.target.value;
        draft.set(_.decoupleSet(draft.current, 'details.description', description));
    });
    const handleEmblemChange = useCallback((evt) => {
        const resources = evt.target.value;
        draft.set(_.decoupleSet(draft.current, 'details.resources', description));
    });
    const handleMembershipOptionClick = useCallback((evt) => {
        const optsBefore = _.get(draft.current, 'settings.membership', {});
        const opts = toggleOption(optsBefore, membershipOptions, evt.name);
        draft.set(_.decoupleSet(draft.current, 'settings.membership', opts));
    });
    const handleAccessControlOptionClick = useCallback((evt) => {
        const optsBefore = _.get(draft.current, 'settings.access_control', {});
        const opts = toggleOption(optsBefore, accessControlOptions, evt.name);
        draft.set(_.decoupleSet(draft.current, 'settings.access_control', opts));
    });

    render();
    const currentUserID = await db.start();
    const system = await SystemFinder.findSystem(db);
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    render();
    const project = (!creating) ? await ProjectFinder.findProject(db, projectID) : null;
    draft.base(project || {});
    render();
    const statistics = (!creating) ? await StatisticsFinder.findDailyActivitiesOfProject(db, project) : null;
    render();

    function render() {
        const { changed } = draft;
        const title = p(_.get(draft.current, 'details.title')) || _.get(draft.current, 'name');
        show(
            <div className="project-summary-page">
                {renderButtons()}
                <h2>{t('project-summary-$title', title)}</h2>
                <UnexpectedError error={draft.error} />
                {renderForm()}
                {renderInstructions()}
                {renderChart()}
                <ActionConfirmation ref={confirmationRef} env={env} />
                <DataLossWarning changes={changed} route={route} env={env} />
            </div>
        );
    }

    function renderButtons() {
        const { changed } = draft;
        if (editing) {
            // using keys here to force clearing of focus
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
        } else {
            const active = (project) ? !project.deleted && !project.archived : true;
            let preselected;
            if (active) {
                preselected = (creating) ? 'add' : 'return';
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
            value: _.get(draft.current, 'details.title', {}),
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
            value: _.get(draft.current, 'name', ''),
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
            value: _.get(draft.current, 'details.description', {}),
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
            resources: _.get(draft.current, 'details.resources', []),
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
        const optsCurr = _.get(draft.current, 'settings.membership', {});
        const optsPrev = _.get(draft.original, 'settings.membership', {});
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
            readOnly: !editing,
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
        const optsCurr = _.get(draft.current, 'settings.access_control', {});
        const optsPrev = _.get(draft.original, 'settings.access_control', {});
        return renderOption(option, optsCurr, optsPrev, i);
    }

    function renderInstructions() {
        const props = {
            folder: 'project',
            topic: 'project-summary',
            hidden: !editing,
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

    async function archive(base) {
        await confirm(t('project-summary-confirm-archive'));
        const changes = { id: base.id, archived: true };
        await db.saveOne({ table: 'project' }, changes);
        handleReturnClick();
    }

    async function remove(base) {
        await confirm(t('project-summary-confirm-delete'));
        const changes = { id: base.id, deleted: true };
        await db.saveOne({ table: 'project' }, changes);
        handleReturnClick();
    }

    async function restore(base) {
        await confirm(t('project-summary-confirm-restore'));
        const changes = { id: base.id, disabled: true, deleted: true };
        await db.saveOne({ table: 'project' }, changes);
    }

    async function save(base, ours) {
        validate(ours);
        setSaving(true);
        try {
            const projectAfter = await db.saveOne({ table: 'project' }, ours);
            payloads.dispatch(projectAfter);
            handleCancelClick();
            return projectAfter;
        } catch (err) {
            if (err.statusCode === 409) {
                setProblems({ name: 'validation-duplicate-project-name' });
                err = new Cancellation;
            }
            throw err;
        } finally {
            setSaving(false);
        }
    }

    function validate(ours) {
        const name = _.toLower(_.trim(ours.name));
        const reservedNames = [ 'global', 'admin', 'public', 'srv' ];
        if (!name) {
            problems.name = 'validation-required';
        } else if (_.includes(reservedNames, name)) {
            problems.name = 'validation-illegal-project-name';
        }
        setProblems(problems);
        if (!_.isEmpty(problems)) {
            throw new Cancellation;
        }
    }
}

function toggleOption(optsBefore, list, name) {
    const option = _.find(list, { name });
    let opts;
    if (option.none) {
        opts = {};
    } else {
        opts = _.clone(optsBefore);
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
