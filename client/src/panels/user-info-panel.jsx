import _ from 'lodash';
import React, { useCallback } from 'react';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { TextField } from '../widgets/text-field.jsx';

import './user-info-panel.scss';

/**
 * Panel for entering the user's basic personal information.
 */
function UserInfoPanel(props) {
    const { env, userDraft } = props;
    const { t, p } = env.locale;

    const handleNameChange = useCallback((evt) => {
        const name = evt.target.value;
        userDraft.update('details.name', name);
    });
    const handleEmailChange = useCallback((evt) => {
        const address = evt.target.value;
        userDraft.update('details.email', address);
    });
    const handlePhoneChange = useCallback((evt) => {
        const number = evt.target.value;
        userDraft.update('details.phone', number);
    });
    const handleGenderChange = useCallback((evt) => {
        const gender = evt.target.value;
        userDraft.update('details.gender', gender || undefined);
    });

    return (
        <SettingsPanel className="user-info">
            <header>
                <i className="fa fa-user-circle" /> {t('settings-user-information')}
            </header>
            <body>
                {renderNameInput()}
                {renderEmailInput()}
                {renderPhoneInput()}
                {renderGenderSelector()}
            </body>
        </SettingsPanel>
    );

    function renderNameInput() {
        const name = userDraft.get('details.name');
        const props = {
            id: 'name',
            value: p(name),
            env,
            onChange: handleNameChange,
        };
        return <TextField {...props}>{t('user-info-name')}</TextField>;
    }

    function renderEmailInput() {
        const props = {
            id: 'email',
            value: userDraft.get('details.email'),
            env,
            onChange: handleEmailChange,
        };
        return <TextField {...props}>{t('user-info-email')}</TextField>;
    }

    function renderPhoneInput() {
        const props = {
            id: 'email',
            value: userDraft.get('details.phone'),
            env,
            onChange: handlePhoneChange,
        };
        return <TextField {...props}>{t('user-info-phone')}</TextField>;
    }

    function renderGenderSelector() {
        const props = {
            id: 'gender',
            value: userDraft.get('details.gender', ''),
            size: 3,
            onChange: handleGenderChange,
        };
        return (
            <div className="gender-selector">
                <label htmlFor="gender">{t('user-info-gender')}</label>
                <select {...props}>
                    <option value="male">{t('user-info-gender-male')}</option>
                    <option value="female">{t('user-info-gender-female')}</option>
                    <option value="">{t('user-info-gender-unspecified')}</option>
                </select>
            </div>
        );
    }
}

export {
    UserInfoPanel as default,
    UserInfoPanel,
};
