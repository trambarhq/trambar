import _ from 'lodash';
import React, { useState } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as WikiFinder from 'common/objects/finders/wiki-finder.mjs';
import * as WikiSaver from 'common/objects/savers/wiki-saver.mjs';
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

import './wiki-summary-page.scss';

async function WikiSummaryPage(props) {
    const { database, projectID, wikiID } = props;
    const creating = (wikiID === 'new');
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const system = await SystemFinder.findSystem(database);
    const project = await ProjectFinder.findProject(database, projectID);
    const schema = project.name;
    const wiki = !creating ? await WikiFinder.findWiki(database, schema, wikiID) : null;
    render();

    function render() {
        const sprops = { system, project, wiki, creating };
        show(<WikiSummaryPageSync key={wikiID} {...sprops} {...props} />);
    }
}

function WikiSummaryPageSync(props) {
    const { system, project, wiki, users, creating } = props;
    const { database, route, env, editing } = props;
    const { t, p } = env.locale;
    const schema = project.name;
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    const readOnly = !editing && !creating;
    const [ adding, setAdding ] = useState(false);
    const draft = useDraftBuffer({
        original: wiki || {},
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
        route.push({ wikiID: 'new' });
    });
    const handleReturnClick = useListener((evt) => {
        route.push('wiki-list-page', { projectID: project.id });
    });
    const handleDisableClick = useListener((evt) => {
        run(async () => {
            await confirm(t('wiki-summary-confirm-disable'));
            await WikiSaver.disableWiki(database, schema, wiki);
            handleReturnClick();
        });
    });
    const handleRemoveClick = useListener((evt) => {
        run(async () => {
            await confirm(t('wiki-summary-confirm-delete'));
            await WikiSaver.removeWiki(database, schema, wiki);
            handleReturnClick();
        });
    });
    const handleRestoreClick = useListener((evt) => {
        run(async () => {
            await confirm(t('wiki-summary-confirm-reactivate'));
            await WikiSaver.restoreWiki(database, schema, wiki);
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

                const wikiAfter = await WikiSaver.saveWiki(database, schema, draft.current);

                if (creating) {
                    setAdding(true);
                }
                warnDataLoss(false);
                route.replace({ editing: undefined, wikiID: wikiAfter.id });
            } catch (err) {
                if (err.statusCode === 409) {
                    reportProblems({ name: 'validation-duplicate-wiki-name' });
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

    const title = draft.get('details.title');
    return (
        <div className="wiki-summary-page">
            {renderButtons()}
            <h2>{t('wiki-summary-$title', title)}</h2>
            <UnexpectedError error={error} />
            {renderForm()}
            {renderInstructions()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            const active = (wiki) ? !wiki.deleted && !wiki.disabled : true;
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
                            {t('wiki-summary-return')}
                        </option>
                        <option name="add" onClick={handleAddClick}>
                            {t('wiki-summary-add')}
                        </option>
                        <option name="archive" disabled={!active} separator onClick={handleDisableClick}>
                            {t('wiki-summary-disable')}
                        </option>
                        <option name="delete" disabled={!active} onClick={handleRemoveClick}>
                            {t('wiki-summary-delete')}
                        </option>
                        <option name="reactivate" hidden={active} onClick={handleRestoreClick}>
                            {t('wiki-summary-reactivate')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('wiki-summary-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const { changed } = draft;
            return (
                <div className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('wiki-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('wiki-summary-save')}
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
                {t('wiki-summary-title')}
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
                {t('wiki-summary-name')}
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
                {t('wiki-summary-description')}
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
                {t('wiki-summary-url')}
            </TextField>
        );
    }

    function renderInstructions() {
        const instructionProps = {
            folder: 'wiki',
            topic: 'wiki-summary',
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

const component = Relaks.memo(WikiSummaryPage);

export {
    component as default,
    component as WikiSummaryPage,
};
