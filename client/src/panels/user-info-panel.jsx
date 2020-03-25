import React from 'react';
import { useListener } from 'relaks';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { TextField } from '../widgets/text-field.jsx';

import './user-info-panel.scss';

/**
 * Panel for entering the user's basic personal information.
 */
export function UserInfoPanel(props) {
  const { env, userDraft } = props;
  const { t, p } = env.locale;

  const handleNameChange = useListener((evt) => {
    const name = evt.target.value;
    userDraft.set('details.name', name);
  });
  const handleEmailChange = useListener((evt) => {
    const address = evt.target.value;
    userDraft.set('details.email', address);
  });
  const handlePhoneChange = useListener((evt) => {
    const number = evt.target.value;
    userDraft.set('details.phone', number);
  });
  const handleGenderChange = useListener((evt) => {
    const gender = evt.target.value;
    userDraft.set('details.gender', gender || undefined);
  });

  return (
    <SettingsPanel className="user-info">
      <header>
        <i className="fas fa-user-circle" /> {t('settings-user-information')}
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
      id: 'phone',
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
