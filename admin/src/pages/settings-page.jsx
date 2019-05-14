import _ from 'lodash';
import React, { useState, useCallback } from 'react';
import Relaks, { useProgress, useSaveBuffer } from 'relaks';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';
import * as SystemSettings from 'common/objects/settings/system-settings.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { ImageSelector } from '../widgets/image-selector.jsx';
import { DataLossWarning } from '../widgets/data-loss-warning.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

// custom hooks
import {
    useEditHandling,
} from '../hooks.mjs';

import './settings-page.scss';

async function SettingsPage(props) {
    const { database, route, env, payloads, editing } = props;
    const { t, p, directory } = env.locale;
    const db = database.use({ schema: 'global', by: this });
    const readOnly = !editing;
    const [ problems, setProblems ] = useState({});
    const [ show ] = useProgress();
    const draft = useSaveBuffer({
        save,
        compare: _.isEqual,
        reset: !editing,
    });

    const [ handleEditClick, handleCancelClick ] = useEditHandling(route);
    const handleSaveClick = useCallback(async (evt) => {
        await draft.save();
    });
    const handleTitleChange = useCallback((evt) => {
        const title = evt.target.value;
        draft.set(_.decoupleSet(draft.current, 'details.title', title));
    });
    const handleCompanyNameChange = useCallback((evt) => {
        const name = evt.target.value;
        draft.set(_.decoupleSet(draft.current, 'details.company_name', name));
    });
    const handleAddressChange = useCallback((evt) => {
        const address = evt.target.value;
        draft.set(_.decoupleSet(draft.current, 'settings.address', address));
    });
    const handlePushRelayChange = useCallback((evt) => {
        const address = evt.target.value;
        draft.set(_.decoupleSet(draft.current, 'settings.push_relay', address));
    });
    const handleDescriptionChange = useCallback((evt) => {
        const description = evt.target.value;
        draft.set(_.decoupleSet(draft.current, 'details.description', description));
    });
    const handleBackgroundImageChange = useCallback((evt) => {
        const resources = evt.target.value;
        draft.set(_.decoupleSet(draft.current, 'details.resources', resources));
    });
    const handleLanguageOptionClick = useCallback((evt) => {
        const lang = evt.name;
        const listBefore = _.get(draft.current, 'settings.input_languages', []);
        const listAfter = _.toggle(listBefore, lang);
        draft.set(_.decoupleSet(draft.current, 'settings.input_languages', listAfter));
    });

    render();
    const currentUserID = await db.start();
    let system = await SystemFinder.findSystem(db);
    if (_.isEmpty(system)) {
        system = getDefault();
    }
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    draft.base(system);
    render();

    function render() {
        show(
            <div className="settings-page">
                {renderButtons()}
                <h2>{t('settings-title')}</h2>
                <UnexpectedError error={draft.error} />
                {renderForm()}
                {renderInstructions()}
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
                        {t('settings-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('settings-save')}
                    </PushButton>
                    <DataLossWarning changes={changed} env={env} route={route} />
                </div>
            );
        } else {
            return (
                <div key="view" className="buttons">
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('settings-edit')}
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
            value: _.get(draft.current, 'details.title', {}),
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
            value: _.get(draft.current, 'details.company_name', ''),
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
            value: _.get(draft.current, 'details.description', {}),
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
            value: _.get(draft.current, 'settings.address', ''),
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
            value: _.get(draft.current, 'settings.push_relay', ''),
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
            resources: _.get(draft.current, 'details.resources', []),
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
        const listCurr = _.get(draft.current, 'settings.input_languages', []);
        const listPrev = _.get(draft.original, 'settings.input_languages', []);
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
            hidden: !editing,
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }

    async function save(base, ours) {
        saveSaving(true);
        try {
            const systemAfter = await db.saveOne({ table: 'system' }, ours);
            payloads.dispatch(systemAfter);
            handleCancelClick();
        } finally {
            saveSaving(false);
        }
    }
}

function getDefault() {
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

const component = Relaks.memo(SettingsPage);

export {
    component as default,
    component as SettingsPage,
};
