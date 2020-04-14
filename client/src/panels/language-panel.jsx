import React from 'react';
import { useListener } from 'relaks';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { OptionButton } from '../widgets/option-button.jsx';

import './language-panel.scss';

/**
 * Panel for changing the UI language.
 */
export function LanguagePanel(props) {
  const { env } = props;
  const { t, languageCode, countryCode, directory } = env.locale;
  const languages = directory.filter((language) => {
    return !!language.module;
  });

  const handleLanguageClick = useListener((evt) => {
    const code = evt.currentTarget.id;
    if (code !== languageCode) {
      const language = directory.find(lng => lng.code === code);
      const localeCode = `${language.code}-${language.defaultCountry}`;
      env.locale.change(localeCode);
    }
  });
  const handleCountryChange = useListener((evt) => {
    const code = evt.currentTarget.value;
    if (code !== countryCode) {
      const localeCode = `${languageCode}-${code}`;
      env.locale.change(localeCode);
    }
  });

  return (
    <SettingsPanel className="language">
      <header>
        <i className="fas fa-language" /> {t('settings-language')}
      </header>
      <body>
        {languages.map(renderButton)}
      </body>
    </SettingsPanel>
  );

  function renderButton(language) {
    const countrySelect = renderCountrySelect(language);
    const buttonProps = {
      label: <span>{language.name}{countrySelect}</span>,
      selected: (language.code === languageCode),
      onClick: handleLanguageClick,
      id: language.code,
    };
    return <OptionButton key={language.code} {...buttonProps} />
  }

  function renderCountrySelect(language) {
    let className;
    if (language.code !== languageCode || language.countries.length <= 1) {
      className = 'sole';
    }
    const props = {
      value: countryCode || language.defaultCountry,
      onChange: handleCountryChange,
      className,
    };
    return (
      <select key={1} {...props}>
        {Object.entries(language.countries).map(renderCountryOption)}
      </select>
    );
  }

  function renderCountryOption(entry, key) {
    const [ code, name ] = entry;
    return <option key={key} value={code}>{name}</option>;
  }
}
