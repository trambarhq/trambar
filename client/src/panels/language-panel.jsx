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
        let t = this.props.locale.translate;
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
        let languages = _.filter(this.props.locale.directory, (language) => {
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
        let countrySelect = this.renderCountrySelect(language);
        let buttonProps = {
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
        let languageCode = this.props.locale.languageCode;
        let countryCode = this.props.locale.countryCode;
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
        let code = evt.currentTarget.id;
        if (code !== this.props.locale.languageCode) {
            let language = _.find(this.props.locale.directory, { code });
            let dialectCode = language.code + '-' + language.defaultCountry;
            this.props.locale.change(dialectCode);
        }
    }

    /**
     * Called when user changes the country dropdown
     *
     * @param  {Event} evt
     */
    handleCountryChange = (evt) => {
        let code = evt.currentTarget.value;
        if (code !== this.props.locale.countryCode) {
            let languageCode = this.props.locale.languageCode;
            let localeCode = languageCode + '-' + code;
            this.props.locale.change(localeCode);
        }
    }
}

export {
    LanguagePanel as default,
    LanguagePanel,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');
    
    LanguagePanel.propTypes = {
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
