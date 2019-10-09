import _ from 'lodash';
import React, { useState } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';
import * as SystemSaver from 'common/objects/savers/system-saver.mjs';
import * as SystemSettings from 'common/objects/settings/system-settings.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { ImageSelector } from '../widgets/image-selector.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';

// custom hooks
import {
    useDraftBuffer,
    useValidation,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './settings-page.scss';

async function SettingsPage(props) {
    const { database } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const system = await SystemFinder.findSystem(database);
    render();

    function render() {
        const sprops = { system };
        show(<SettingsPageSync {...sprops} {...props} />);
    }
}

function SettingsPageSync(props) {
    const { system, editing } = props;
    const { database, route, env, payloads } = props;
    const { t, p, directory } = env.locale;
    const availableLanguageCodes = system?.settings?.input_languages ?? [];
    const readOnly = !editing;
    const draft = useDraftBuffer({
        original: system,
        prefill: getDefaultSystem,
        reset: readOnly,
    });
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();
    const warnDataLoss = useDataLossWarning(route, env, confirm);

    const handleEditClick = useListener((evt) => {
        route.replace({ editing: true });
    });
    const handleCancelClick = useListener((evt) => {
        route.replace({ editing: undefined });
    });
    const handleSaveClick = useListener((evt) => {
        run(async () => {
            const systemAfter = await SystemSaver.saveSystem(database, draft.current);
            payloads.dispatch(systemAfter);
            warnDataLoss(false);
            handleCancelClick();
        });
    });
    const handleTitleChange = useListener((evt) => {
        const title = evt.target.value;
        draft.set('details.title', title);
    });
    const handleCompanyNameChange = useListener((evt) => {
        const name = evt.target.value;
        draft.set('details.company_name', name);
    });
    const handleAddressChange = useListener((evt) => {
        const address = evt.target.value;
        draft.set('settings.address', address);
    });
    const handlePushRelayChange = useListener((evt) => {
        const address = evt.target.value;
        draft.set('settings.push_relay', address);
    });
    const handleDescriptionChange = useListener((evt) => {
        const description = evt.target.value;
        draft.set('details.description', description);
    });
    const handleBackgroundImageChange = useListener((evt) => {
        const resources = evt.target.value;
        draft.set('details.resources', resources);
    });
    const handleLanguageOptionClick = useListener((evt) => {
        const lang = evt.name;
        const listBefore = draft.get('settings.input_languages', []);
        const list = _.toggle(listBefore, lang);
        draft.set('settings.input_languages', list);
    });

    warnDataLoss(draft.changed);

    return (
        <div className="settings-page">
            {renderButtons()}
            <h2>{t('settings-title')}</h2>
            <UnexpectedError error={error} />
            {renderForm()}
            {renderInstructions()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            // using keys here to force clearing of focus
            return (
                <div key="view" className="buttons">
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('settings-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const { changed } = draft;
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('settings-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('settings-save')}
                    </PushButton>
                </div>
            );
        }
    }

    function renderForm() {
        return (
            <div className="form">
                {renderTitleInput()}
                {renderCompanyNameInput()}
                {renderDescriptionInput()}
                {renderSiteAddressInput()}
                {renderPushRelayInput()}
                {renderBackgroundSelector()}
                {renderInputLanguageSelector()}
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
                {t('settings-site-title')}
            </MultilingualTextField>
        );
    }

    function renderCompanyNameInput() {
        const props = {
            id: 'company_name',
            value: draft.get('details.company_name', ''),
            readOnly,
            env,
            onChange: handleCompanyNameChange,
        };
        return (
            <TextField {...props}>
                {t('settings-company-name')}
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
                {t('settings-site-description')}
            </MultilingualTextField>
        )
    }

    function renderSiteAddressInput() {
        const props = {
            id: 'address',
            type: 'url',
            spellCheck: false,
            value: draft.get('settings.address', ''),
            placeholder: 'https://',
            env,
            readOnly,
            onChange: handleAddressChange,
        };
        return (
            <TextField {...props}>
                {t('settings-site-address')}
            </TextField>
        );
    }

    function renderPushRelayInput() {
        const props = {
            id: 'relay',
            type: 'url',
            spellCheck: false,
            value: draft.get('settings.push_relay', ''),
            placeholder: 'https://',
            readOnly,
            env,
            onChange: handlePushRelayChange,
        };
        return (
            <TextField {...props}>
                {t('settings-push-relay')}
            </TextField>
        );
    }

    function renderBackgroundSelector() {
        const props = {
            purpose: 'background',
            resources: draft.get('details.resources', []),
            readOnly,
            database,
            payloads,
            env,
            onChange: handleBackgroundImageChange,
        };
        return (
            <ImageSelector {...props}>
                {t('settings-background-image')}
            </ImageSelector>
        );
    }

    function renderInputLanguageSelector() {
        const listProps = {
            readOnly,
            onOptionClick: handleLanguageOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('settings-input-languages')}</label>
                {_.map(directory, renderInputLanguage)}
            </OptionList>
        );
    }

    function renderInputLanguage(language, i) {
        const listCurr = draft.getCurrent('settings.input_languages', []);
        const listPrev = draft.getOriginal('settings.input_languages', []);
        const pos = _.indexOf(listCurr, language.code) + 1;
        let badge;
        if (pos) {
            badge = <span className="language-badge">{pos}</span>;
        }
        const props = {
            name: language.code,
            selected: _.includes(listCurr, language.code),
            previous: _.includes(listPrev, language.code),
        };
        return (
            <option key={i} {...props}>
                <span>{language.name} {badge}</span>
            </option>
        );
    }

    function renderInstructions() {
        const instructionProps = {
            folder: 'settings',
            topic: 'settings',
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

function getDefaultSystem(base) {
    if (_.isEmpty(base)) {
        // use timezone to determine default relay
        const tzOffset = (new Date()).getTimezoneOffset() / 60;
        let defaultRelay;
        if (-5 <= tzOffset && tzOffset <= 0) {
            defaultRelay = 'https://eu-west-1.push.trambar.io';
        } else {
            defaultRelay = 'https://us-east-1.push.trambar.io';
        }
        return {
            details: {},
            settings: {
                address: window.location.protocol + '//' + window.location.host,
                push_relay: defaultRelay,
            }
        };
    }
}

const component = Relaks.memo(SettingsPage);

export {
    component as default,
    component as SettingsPage,
};
