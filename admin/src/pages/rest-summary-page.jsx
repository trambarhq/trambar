import _ from 'lodash';
import React, { useState, useMemo } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { ExcelFile } from 'trambar-www';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectUtils from 'common/objects/utils/project-utils.mjs';
import * as RestFinder from 'common/objects/finders/rest-finder.mjs';
import * as RestSaver from 'common/objects/savers/rest-saver.mjs';
import * as RestUtils from 'common/objects/utils/rest-utils.mjs';
import { RestTypes } from 'common/objects/types/rest-types.mjs';
import * as HTTPRequest from 'common/transport/http-request.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { URLLink } from '../widgets/url-link.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { ImagePreviewDialogBox } from '../dialogs/image-preview-dialog-box.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

// custom hooks
import {
    useDraftBuffer,
    useSelectionBuffer,
    useValidation,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './rest-summary-page.scss';

async function RestSummaryPage(props) {
    const { database, projectID, restID, env } = props;
    const creating = (restID === 'new');
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const project = await ProjectFinder.findProject(database, projectID);
    const schema = project.name;
    const rest = !creating ? await RestFinder.findRest(database, schema, restID) : null;
    render();

    function render() {
        const sprops = { schema, project, rest, creating };
        show(<RestSummaryPageSync key={restID} {...sprops} {...props} />);
    }
}

function RestSummaryPageSync(props) {
    const { schema, project, rest, users, creating } = props;
    const { database, route, env, editing } = props;
    const { t, p } = env.locale;
    const readOnly = !editing && !creating;
    const [ adding, setAdding ] = useState(false);
    const draft = useDraftBuffer({
        original: rest || { type: 'wordpress' },
        reset: readOnly,
    });
    const [ problems, reportProblems ] = useValidation(!readOnly);
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
        route.push({ restID: 'new' });
    });
    const handleReturnClick = useListener((evt) => {
        route.push('rest-list-page', { projectID: project.id });
    });
    const handleDisableClick = useListener((evt) => {
        run(async () => {
            await confirm(t('rest-summary-confirm-disable'));
            await RestSaver.disableRest(database, schema, rest);
            handleReturnClick();
        });
    });
    const handleRemoveClick = useListener((evt) => {
        run(async () => {
            await confirm(t('rest-summary-confirm-delete'));
            await RestSaver.removeRest(database, schema, rest);
            handleReturnClick();
        });
    });
    const handleRestoreClick = useListener((evt) => {
        run(async () => {
            await confirm(t('rest-summary-confirm-reactivate'));
            await RestSaver.restoreRest(database, schema, rest);
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

                const restAfter = await RestSaver.saveRest(database, schema, draft.current);
                if (creating) {
                    setAdding(true);
                }
                warnDataLoss(false);
                route.replace({ editing: undefined, restID: restAfter.id });
            } catch (err) {
                if (err.statusCode === 409) {
                    reportProblems({ name: 'validation-duplicate-source-name' });
                } else {
                    throw err;
                }
            }
        });
    });
    const handleNameChange = useListener((evt) => {
        const name = _.toLower(evt.target.value).replace(/[^\w\-]+/g, '');
        draft.set('name', name);
    });
    const handleURLChange = useListener((evt) => {
        const url = evt.target.value;
        draft.set('url', url);
    });
    const handleURLBlur = useListener((evt) => {
        try {
            const url = draft.get('url');
            const urlParts = new URL(url);
            const type = draft.get('type');
            if (type === 'wordpress') {
                if (urlParts.pathname === '/') {
                    urlParts.pathname = '/wp-json/';
                }
            }
            const newURL = urlParts.toString();
            if (url !== newURL) {
                draft.set('url', newURL);
            }
        } catch (err) {
        }
    });
    const handleTypeOptionClick = useListener((evt) => {
        const type = evt.name;
        draft.set('type', type);
    });
    const handleMaxAgeChange = useListener((evt) => {
        const text = _.trim(evt.target.value);
        if (text) {
            const maxAge = parseInt(text);
            if (maxAge === maxAge) {
                draft.set('settings.max_age', maxAge);
            }
        } else {
            draft.unset('settings.max_age');
        }
    });

    warnDataLoss(draft.changed);

    const title = RestUtils.getDisplayName(draft.current, env);
    return (
        <div className="rest-summary-page">
            {renderButtons()}
            <h2>{t('rest-summary-$title', title)}</h2>
            <UnexpectedError error={error} />
            {renderForm()}
            {renderInstructions()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            const active = (rest) ? !rest.deleted && !rest.disabled : true;
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
                            {t('rest-summary-return')}
                        </option>
                        <option name="add" onClick={handleAddClick}>
                            {t('rest-summary-add')}
                        </option>
                        <option name="archive" disabled={!active} separator onClick={handleDisableClick}>
                            {t('rest-summary-disable')}
                        </option>
                        <option name="delete" disabled={!active} onClick={handleRemoveClick}>
                            {t('rest-summary-delete')}
                        </option>
                        <option name="reactivate" hidden={active} onClick={handleRestoreClick}>
                            {t('rest-summary-reactivate')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('rest-summary-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const { changed } = draft;
            return (
                <div className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('rest-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('rest-summary-save')}
                    </PushButton>
                </div>
            );
        }
    }

    function renderForm() {
        return (
            <div className="form">
                {renderURLInput()}
                {renderNameInput()}
                {renderTypeSelector()}
                {renderMaxAgeInput()}
            </div>
        );
    }

    function renderURLInput() {
        const url = draft.get('url', '');
        const props = {
            id: 'url',
            value: draft.get('url', ''),
            readOnly,
            env,
            onChange: handleURLChange,
            onBlur: handleURLBlur,
        };
        return (
            <TextField {...props}>
                {t('rest-summary-url')}
                {' '}
                <URLLink url={url} />
            </TextField>
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
                {t('rest-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    }

    function renderTypeSelector() {
        const listProps = {
            readOnly,
            onOptionClick: handleTypeOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>
                    {t('rest-summary-type')}
                    <InputError>{t(problems.type)}</InputError>
                </label>
                {_.map(RestTypes, renderTypeOption)}
            </OptionList>
        );
    }

    function renderTypeOption(type, i) {
        const typeCurr = draft.getCurrent('type', '') || 'generic';
        const typePrev = draft.getOriginal('type', '') || 'generic';
        const props = {
            name: type,
            selected: (typeCurr === type),
            previous: (typePrev === type),
        };
        return (
            <option key={i} {...props}>
                {t(`rest-type-${type}`)}
            </option>
        );
    }

    function renderMaxAgeInput() {
        const defaultMaxAge = '30';
        const maxAge = draft.get('settings.max_age');
        let text = '';
        if (typeof(maxAge) === 'number') {
            text = maxAge;
        } else if (!editing) {
            text = defaultMaxAge;
        }
        const props = {
            id: 'max_page',
            value: text,
            type: 'number',
            readOnly,
            env,
            placeholder: defaultMaxAge,
            onChange: handleMaxAgeChange,
        };
        return (
            <TextField {...props}>
                {t('rest-summary-max-age')}
            </TextField>
        );
    }

    function renderInstructions() {
        const instructionProps = {
            folder: 'rest',
            topic: 'rest-summary',
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

const component = Relaks.memo(RestSummaryPage);

export {
    component as default,
    component as RestSummaryPage,
};
