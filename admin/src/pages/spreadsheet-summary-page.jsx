import _ from 'lodash';
import React, { useState } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as SpreadsheetFinder from 'common/objects/finders/spreadsheet-finder.mjs';
import * as SpreadsheetSaver from 'common/objects/savers/spreadsheet-saver.mjs';
import * as SpreadsheetUtils from 'common/objects/utils/spreadsheet-utils.mjs';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

// custom hooks
import {
    useDraftBuffer,
    useSelectionBuffer,
    useAutogenID,
    useValidation,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './spreadsheet-summary-page.scss';

async function SpreadsheetSummaryPage(props) {
    const { database, projectID, spreadsheetID } = props;
    const creating = (spreadsheetID === 'new');
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const system = await SystemFinder.findSystem(database);
    const project = await ProjectFinder.findProject(database, projectID);
    const schema = project.name;
    const spreadsheet = !creating ? await SpreadsheetFinder.findSpreadsheet(database, schema, spreadsheetID) : null;
    render();

    function render() {
        const sprops = { system, project, spreadsheet, creating };
        show(<SpreadsheetSummaryPageSync key={spreadsheetID} {...sprops} {...props} />);
    }
}

function SpreadsheetSummaryPageSync(props) {
    const { system, project, spreadsheet, users, creating } = props;
    const { database, route, env, editing } = props;
    const { t, p } = env.locale;
    const schema = project.name;
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    const readOnly = !editing && !creating;
    const [ adding, setAdding ] = useState(false);
    const draft = useDraftBuffer({
        original: spreadsheet || {},
        reset: readOnly,
    });
    const [ problems, reportProblems ] = useValidation();
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();
    const warnDataLoss = useDataLossWarning(route, env, confirm);

    const handleEditClick = useListener((evt) => {
        route.replace({ editing: true });
    });
    const handleCancelClick = useListener((evt) => {
        if (creating) {
            handleReturnClick();
        } else {
            route.replace({ editing: undefined });
        }
    });
    const handleAddClick = useListener((evt) => {
        route.push({ spreadsheetID: 'new' });
    });
    const handleReturnClick = useListener((evt) => {
        route.push('spreadsheet-list-page', { projectID: project.id });
    });
    const handleDisableClick = useListener((evt) => {
        run(async () => {
            await confirm(t('spreadsheet-summary-confirm-disable'));
            await SpreadsheetSaver.disableSpreadsheet(database, schema, spreadsheet);
            handleReturnClick();
        });
    });
    const handleRemoveClick = useListener((evt) => {
        run(async () => {
            await confirm(t('spreadsheet-summary-confirm-delete'));
            await SpreadsheetSaver.removeSpreadsheet(database, schema, spreadsheet);
            handleReturnClick();
        });
    });
    const handleRestoreClick = useListener((evt) => {
        run(async () => {
            await confirm(t('spreadsheet-summary-confirm-reactivate'));
            await SpreadsheetSaver.restoreSpreadsheet(database, schema, spreadsheet);
        });
    });
    const handleSaveClick = useListener((evt) => {
        run(async () => {
            try {
                const problems = {};
                const name = draft.get('name');
                if (!name) {
                    problems.name = 'validation-required';
                }
                reportProblems(problems);

                const spreadsheetAfter = await SpreadsheetSaver.saveSpreadsheet(database, schema, draft.current);

                if (creating) {
                    setAdding(true);
                }
                warnDataLoss(false);
                route.replace({ editing: undefined, spreadsheetID: spreadsheetAfter.id });
            } catch (err) {
                if (err.statusCode === 409) {
                    reportProblems({ name: 'validation-duplicate-spreadsheet-name' });
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
    const handleURLChange = useListener((evt) => {
        const url = evt.target.value;
        draft.set('url', url);
    });

    warnDataLoss(draft.changed);

    const title = SpreadsheetUtils.getDisplayName(draft.current, env);
    return (
        <div className="spreadsheet-summary-page">
            {renderButtons()}
            <h2>{t('spreadsheet-summary-$title', title)}</h2>
            <UnexpectedError error={error} />
            {renderForm()}
            {renderInstructions()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            const active = (spreadsheet) ? !spreadsheet.deleted && !spreadsheet.disabled : true;
            let preselected;
            if (active) {
                preselected = (adding) ? 'add' : 'return';
            } else {
                preselected = 'reactivate';
            }
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={handleReturnClick}>
                            {t('spreadsheet-summary-return')}
                        </option>
                        <option name="add" onClick={handleAddClick}>
                            {t('spreadsheet-summary-add')}
                        </option>
                        <option name="archive" disabled={!active} separator onClick={handleDisableClick}>
                            {t('spreadsheet-summary-disable')}
                        </option>
                        <option name="delete" disabled={!active} onClick={handleRemoveClick}>
                            {t('spreadsheet-summary-delete')}
                        </option>
                        <option name="reactivate" hidden={active} onClick={handleRestoreClick}>
                            {t('spreadsheet-summary-reactivate')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('spreadsheet-summary-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const { changed } = draft;
            return (
                <div className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('spreadsheet-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('spreadsheet-summary-save')}
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
                {renderURLInput()}
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
                {t('spreadsheet-summary-title')}
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
                {t('spreadsheet-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    }

    function renderDescriptionInput() {
        const props = {
            id: 'description',
            value: draft.get('details.description', {}),
            type: 'textarea',
            availableLanguageCodes,
            readOnly,
            env,
            onChange: handleDescriptionChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('spreadsheet-summary-description')}
            </MultilingualTextField>
        );
    }

    function renderURLInput() {
        const props = {
            id: 'oauth_callback',
            value: draft.get('url', ''),
            readOnly,
            env,
            onChange: handleURLChange,
        };
        return (
            <TextField {...props}>
                {t('spreadsheet-summary-url')}
            </TextField>
        );
    }

    function renderInstructions() {
        const instructionProps = {
            folder: 'spreadsheet',
            topic: 'spreadsheet-summary',
            hidden: readOnly,
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }
}

const component = Relaks.memo(SpreadsheetSummaryPage);

export {
    component as default,
    component as SpreadsheetSummaryPage,
};
