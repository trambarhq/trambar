import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import OptionButton from 'widgets/option-button';

import './language-panel.scss';

class LanguagePanel extends PureComponent {
    static displayName = 'LanguagePanel';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var t = this.props.locale.translate;
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
        var languages = _.filter(this.props.locale.directory, (language) => {
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
        var countrySelect = this.renderCountrySelect(language);
        var buttonProps = {
            label: <span>{language.name}{countrySelect}</span>,
            selected: (language.code === this.props.locale.languageCode),
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
        var languageCode = this.props.locale.languageCode;
        var countryCode = this.props.locale.countryCode;
        if (!countryCode) {
            countryCode = language.defaultCountry;
        }
        var options = _.map(language.countries, (name, code) => {
            return <option key={code} value={code}>{name}</option>;
        });
        var props = {
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
        var code = evt.currentTarget.id;
        if (code !== this.props.locale.languageCode) {
            var language = _.find(this.props.locale.directory, { code });
            var dialectCode = language.code + '-' + language.defaultCountry;
            this.props.locale.change(dialectCode);
        }
    }

    /**
     * Called when user changes the country dropdown
     *
     * @param  {Event} evt
     */
    handleCountryChange = (evt) => {
        var code = evt.currentTarget.value;
        if (code !== this.props.locale.countryCode) {
            var languageCode = this.props.locale.languageCode;
            var localeCode = languageCode + '-' + code;
            this.props.locale.change(localeCode);
        }
    }
}

export {
    LanguagePanel as default,
    LanguagePanel,
};

import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');
    
    LanguagePanel.propTypes = {
        locale: PropTypes.instanceOf(Locale).isRequired,
    };
}
