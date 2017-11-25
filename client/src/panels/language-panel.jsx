var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsSection = require('widgets/settings-section');
var OptionButton = require('widgets/option-button');

require('./language-panel.scss');

module.exports = React.createClass({
    displayName: 'LanguagePanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    /**
     * Render the langauge portion of the language code
     *
     * @return {String}
     */
    getSelectedLanguageCode: function() {
        var parts = _.split(this.props.locale.languageCode, '-');
        return _.lowerCase(parts[0]);
    },

    /**
     * Render the country portion of the language code
     *
     * @return {String}
     */
    getSelectedCountryCode: function() {
        var parts = _.split(this.props.locale.languageCode, '-');
        return _.lowerCase(parts[1]);
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <SettingsSection className="language">
                <header>
                    <i className="fa fa-language" /> {t('settings-language')}
                </header>
                <body>
                    {this.renderList()}
                </body>
            </SettingsSection>
        );
    },

    /**
     * Render list of languages
     *
     * @return {Array<ReactElement>}
     */
    renderList: function() {
        var languages = _.filter(this.props.locale.directory, { locales: { client: true } });
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
        var languageCode = this.getSelectedLanguageCode();
        var buttonProps = {
            label: [ language.name, this.renderCountrySelect(language) ],
            selected: (language.code === languageCode),
            onClick: this.handleLanguageClick,
            id: language.code,
        };
        return <OptionButton key={language.code} {...buttonProps} />
    },

    /**
     * Render a dropbox select control
     *
     * @param  {Object} language
     *
     * @return {ReactElement}
     */
    renderCountrySelect: function(language) {
        var languageCode = this.getSelectedLanguageCode();
        var countryCode = this.getSelectedCountryCode();
        if (!countryCode) {
            countryCode = language.defaultCountry;
        }
        var options = _.map(language.countries, (name, code) => {
            return <option key={code} value={code}>{name}</option>;
        });
        var style;
        if (language.code !== languageCode || _.size(language.countries) <= 1) {
            // always render the select for lay-out purpose
            style = { visibility: 'hidden' };
        }
        return (
            <select key={1} value={countryCode} style={style} onChange={this.handleCountryChange}>
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
        if (code !== this.getSelectedLanguageCode()) {
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
        if (code !== this.getSelectedCountryCode()) {
            var languageCode = this.getSelectedLanguageCode();
            var dialectCode = languageCode + '-' + code;
            this.props.locale.change(dialectCode);
        }
    },
});
