import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import SettingsPanel from '../widgets/settings-panel.jsx';
import OptionButton from '../widgets/option-button.jsx';

import './language-panel.scss';

/**
 * Panel for changing the UI language.
 *
 * @extends PureComponent
 */
class LanguagePanel extends PureComponent {
    static displayName = 'LanguagePanel';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env } = this.props;
        let { t } = env.locale;
        return (
            <SettingsPanel className="language">
                <header>
                    <i className="fa fa-language" /> {t('settings-language')}
                </header>
                <body>
                    {this.renderList()}
                </body>
            </SettingsPanel>
        );
    }

    /**
     * Render list of languages
     *
     * @return {Array<ReactElement>}
     */
    renderList() {
        let { env } = this.props;
        let { directory } = env.locale;
        let languages = _.filter(directory, (language) => {
            return !!language.module;
        });
        return _.map(languages, (language) => {
            return this.renderButton(language);
        });
    }

    /**
     * Render a language button and a country dropdown
     *
     * @param  {Object} language
     *
     * @return {ReactElement}
     */
    renderButton(language) {
        let { env } = this.props;
        let { languageCode } = env.locale;
        let countrySelect = this.renderCountrySelect(language);
        let buttonProps = {
            label: <span>{language.name}{countrySelect}</span>,
            selected: (language.code === languageCode),
            onClick: this.handleLanguageClick,
            id: language.code,
        };
        return <OptionButton key={language.code} {...buttonProps} />
    }

    /**
     * Render a select control for country selection
     *
     * @param  {Object} language
     *
     * @return {ReactElement}
     */
    renderCountrySelect(language) {
        let { env } = this.props;
        let { languageCode, countryCode } = env.locale;
        if (!countryCode) {
            countryCode = language.defaultCountry;
        }
        let options = _.map(language.countries, (name, code) => {
            return <option key={code} value={code}>{name}</option>;
        });
        let props = {
            value: countryCode,
            onChange: this.handleCountryChange,
        };
        if (language.code !== languageCode || _.size(language.countries) <= 1) {
            props.className = 'sole';
        }
        return (
            <select key={1} {...props}>
                {options}
            </select>
        );
    }

    /**
     * Called when user click on a language
     *
     * @param  {Event} evt
     */
    handleLanguageClick = (evt) => {
        let { env } = this.props;
        let { languageCode, directory } = env.locale;
        let code = evt.currentTarget.id;
        if (code !== languageCode) {
            let language = _.find(directory, { code });
            let localeCode = `${language.code}-${language.defaultCountry}`;
            env.locale.change(localeCode);
        }
    }

    /**
     * Called when user changes the country dropdown
     *
     * @param  {Event} evt
     */
    handleCountryChange = (evt) => {
        let { env } = this.props;
        let { languageCode, countryCode } = env.locale;
        let code = evt.currentTarget.value;
        if (code !== countryCode) {
            let localeCode = `${languageCode}-${code}`;
            env.locale.change(localeCode);
        }
    }
}

export {
    LanguagePanel as default,
    LanguagePanel,
};

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    LanguagePanel.propTypes = {
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
