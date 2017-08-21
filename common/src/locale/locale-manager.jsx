var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');

module.exports = React.createClass({
    displayName: 'LocaleManager',
    propTypes: {
        defaultLanguageCode: PropTypes.string,
        database: PropTypes.instanceOf(Database),
        directory: PropTypes.arrayOf(PropTypes.object),
        onChange: PropTypes.func,
        onModuleRequest: PropTypes.func,
    },

    getDefaultProps: function() {
        return {
            defaultLanguageCode: 'en',
        };
    },

    getInitialState: function() {
        return {
            languageCode: '',
            phraseTable: {},
            missingPhrases: [],
        };
    },

    getLanguageCode: function() {
        return this.state.languageCode;
    },

    getDirectory: function() {
        return this.props.directory;
    },

    translate: function(phrase) {
        var entry = this.state.phraseTable[phrase];
        if (entry) {
            if (typeof(entry) === 'function') {
                var args = _.slice(arguments, 1);
                var results = entry.apply(this, args);
                return results;
            } else {
                return entry;
            }
        } else {
            return phrase;
        }
    },

    pick: function(languageVersions) {
        if (typeof(languageVersions) === 'string') {
            console.log(languageVersions)
            return languageVersions;
        }
        // no support for country-specific versions
        var currentLanguageCode = this.state.languageCode.substr(0, 2);
        var matchingPhrase = '';
        var firstNonEmptyPhrase = '';
        var defaultLanguageCode = this.props.defaultLanguageCode.substr(0, 2);
        var defaultLanguagePhrase = '';
        for (var key in languageVersions) {
            var phrase = _.trim(languageVersions[key]);
            var languageCode = _.toLower(key);
            if (languageCode === currentLanguageCode) {
                matchingPhrase = phrase;
            }
            if (!firstNonEmptyPhrase) {
                firstNonEmptyPhrase = phrase;
            }
            if (languageCode === defaultLanguageCode) {
                defaultLanguagePhrase = phrase;
            }
        }
        if (matchingPhrase) {
            return matchingPhrase;
        } else if (defaultLanguagePhrase) {
            return defaultLanguagePhrase;
        } else {
            return firstNonEmptyPhrase;
        }
    },

    change: function(languageCode) {
        languageCode = _.toLower(languageCode);
        if (languageCode === this.state.languageCode) {
            return Promise.resolve(true);
        }
        return this.load(languageCode).then((module) => {
            var phraseTable;
            if (typeof(module) === 'function') {
                phraseTable = module(languageCode);
            } else {
                phraseTable = module;
            }
            var newState = { languageCode, phraseTable };
            this.setState(newState, () => {
                this.triggerChangeEvent();
            });
            return true;
        });
    },

    load: function(languageCode) {
        var module = languageModules[languageCode];
        if (module) {
            return Promise.resolve(module);
        }
        return this.triggerModuleRequest(languageCode).then((module) => {
            languageModules[languageCode] = module;
            return module;
        });
    },

    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    /**
     * Trigger the onModuleRequest handler to ask parent component to load
     * a localization module
     *
     * @param  {String} languageCode
     *
     * @return {Promise<Module>}
     */
    triggerModuleRequest: function(languageCode) {
        if (this.props.onModuleRequest) {
            return this.props.onModuleRequest({
                type: 'module_request',
                target: this,
                languageCode: languageCode,
            });
        } else {
            return Promise.reject('onModuleRequest is not set');
        }
    },

    render: function() {
        return null;
    },

    /**
     * Get the browser's language setting and use it
     */
    componentDidMount: function() {
        var initialLanguageCode = getBrowserLanguage() || this.props.defaultLanguageCode;
        this.change(initialLanguageCode).catch((err) => {
            // use the default language if there's no support for the user's language
            this.change(this.props.defaultLanguageCode);
        });
    },

    /**
     * Get the language settings from local data storage
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!prevProps.database && this.props.database) {
            var db = this.props.database.use({ by: this, schema: 'local' });
            db.start().then(() => {
                return db.findOne({
                    table: 'settings',
                    key: 'language'
                });
            }).then((settings) => {
                if (settings && settings.selectedLanguageCode) {
                    this.change(settings.selectedLanguageCode);
                }
            })
        }
    },
});

var languageModules = {};

function getBrowserLanguage() {
    // check navigator.languages
    _.each(navigator.languages, check);

    // check other fields
    var keys = [ 'language', 'browserLanguage', 'systemLanguage', 'userLanguage' ];
    _.each(keys, (key) => { check(navigator[key]) })

    var code;
    function check(lang) {
        if (code === undefined) {
            if (lang && lang.length >= 2) {
                code = _.toLower(lang);
            }
        }
    }
    return code;
}
