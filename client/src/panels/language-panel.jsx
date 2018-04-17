var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsPanel = require('widgets/settings-panel');
var OptionButton = require('widgets/option-button');

require('./language-panel.scss');

module.exports = React.createClass({
    displayName: 'LanguagePanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
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
    },

    /**
     * Render list of languages
     *
     * @return {Array<ReactElement>}
     */
    renderList: function() {
        var languages = _.filter(this.props.locale.directory, (language) => {
            return !!language.module;
        });
        return _.map(languages, this.renderButton);
    },

    /**
     * Render a language button and a country dropdown
     *
     * @param  {Object} language
     *
     * @return {ReactElement}
     */
    renderButton: function(language) {
        var buttonProps = {
            label: language.name,
            afterLabel: this.renderCountrySelect(language),
            selected: (language.code === this.props.locale.languageCode),
            onClick: this.handleLanguageClick,
            id: language.code,
        };
        return <OptionButton key={language.code} {...buttonProps} />
    },

    /**
     * Render a select control for country selection
     *
     * @param  {Object} language
     *
     * @return {ReactElement}
     */
    renderCountrySelect: function(language) {
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
    },

    /**
     * Called when user click on a language
     *
     * @param  {Event} evt
     */
    handleLanguageClick: function(evt) {
        var code = evt.currentTarget.id;
        if (code !== this.props.locale.languageCode) {
            var language = _.find(this.props.locale.directory, { code });
            var dialectCode = language.code + '-' + language.defaultCountry;
            this.props.locale.change(dialectCode);
        }
    },

    /**
     * Called when user changes the country dropdown
     *
     * @param  {Event} evt
     */
    handleCountryChange: function(evt) {
        var code = evt.currentTarget.value;
        if (code !== this.props.locale.countryCode) {
            var languageCode = this.props.locale.languageCode;
            var localeCode = languageCode + '-' + code;
            this.props.locale.change(localeCode);
        }
    },
});
