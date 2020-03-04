import _ from 'lodash';
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
  const languages = _.filter(directory, (language) => {
    return !!language.module;
  });

  const handleLanguageClick = useListener((evt) => {
    const code = evt.currentTarget.id;
    if (code !== languageCode) {
      const language = _.find(directory, { code });
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
        <i className="fa fa-language" /> {t('settings-language')}
      </header>
      <body>
        {_.map(languages, renderButton)}
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
    if (language.code !== languageCode || _.size(language.countries) <= 1) {
      className = 'sole';
    }
    const props = {
      value: countryCode || language.defaultCountry,
      onChange: handleCountryChange,
      className,
    };
    return (
      <select key={1} {...props}>
        {_.map(language.countries, renderCountryOption)}
      </select>
    );
  }

  function renderCountryOption(name, code) {
    return <option key={code} value={code}>{name}</option>;
  }
}
