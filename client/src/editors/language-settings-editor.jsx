var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsSection = require('widgets/settings-section');
var OptionButton = require('widgets/option-button');

require('./language-settings-editor.scss');

module.exports = React.createClass({
    displayName: 'LanguageSettingsEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getSelectedLanguageCode: function() {
        var parts = _.split(this.props.locale.languageCode, '-');
        return _.lowerCase(parts[0]);
    },

    getSelectedCountryCode: function() {
        var parts = _.split(this.props.locale.languageCode, '-');
        return _.lowerCase(parts[1]);
    },

    render: function() {
        var t = this.props.locale.translate;
        return (
            <SettingsSection className="language-settings-editor">
                <header>
                    <i className="fa fa-language" /> {t('settings-language')}
                </header>
                <body>
                    {this.renderList()}
                </body>
            </SettingsSection>
        );
    },

    renderList: function() {
        var languages = _.filter(this.props.locale.directory, { locales: { client: true } });
        return _.map(languages, this.renderButton);
    },

    renderButton: function(language) {
        var languageCode = this.getSelectedLanguageCode();
        var buttonProps = {
            label: [ language.name, this.renderCountrySelect(language) ],
            selected: (language.code === languageCode),
            onClick: this.handleLanguageClick,
            id: language.code,
            key: language.code
        };
        return <OptionButton {...buttonProps} />
    },

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
