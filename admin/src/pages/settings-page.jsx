var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

// widgets
// widgets
var PushButton = require('widgets/push-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var ImageSelector = require('widgets/image-selector');
var DataLossWarning = require('widgets/data-loss-warning');

require('./settings-page.scss');

module.exports = Relaks.createClass({
    displayName: 'SettingsPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
    },

    statics: {
        /**
         * Match current URL against the page's
         *
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/settings/?'
            ], (params) => {
                params.edit = !!query.edit;
                return params;
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getUrl: function(params) {
            var path = `/settings/`, query, hash;
            if (params && params.edit) {
                query = { edit: 1 };
            }
            return { path, query, hash };
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            system: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
        };
        meanwhile.show(<SettingsPageSync {...props} />, 250);
        return db.start().then((userId) => {
            var criteria = {};
            return db.findOne({ table: 'system', criteria });
        }).then((system) => {
            props.system = system;
            return <SettingsPageSync {...props} />;
        });
    }
});

var SettingsPageSync = module.exports.Sync = React.createClass({
    displayName: 'SettingsPage.Sync',
    propTypes: {
        system: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            newSystem: null,
            saving: false,
        };
    },

    /**
     * Return edited copy of system object or the original object
     *
     * @return {Object}
     */
    getSystem: function() {
        if (this.isEditing()) {
            return this.state.newSystem || this.props.system || defaultSystem;
        } else {
            return this.props.system || emptySystem;
        }
    },

    /**
     * Modify a property of the system object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setSystemProperty: function(path, value) {
        var system = this.getSystem();
        var newSystem = _.decoupleSet(system, path, value);
        var hasChanges = true;
        if (_.isEqual(newSystem, this.props.system)) {
            newSystem = null;
            hasChanges = false;
        }
        this.setState({ newSystem, hasChanges });
    },

    /**
     * Return true when the URL indicate edit mode
     *
     * @param  {Object} props
     *
     * @return {Boolean}
     */
    isEditing: function(props) {
        props = props || this.props;
        return props.route.parameters.edit;
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     *
     * @return {Promise}
     */
    setEditability: function(edit) {
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.edit = edit;
        return route.replace(module.exports, params);
    },

    /**
     * Reset edit state when edit starts
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            if (this.isEditing(nextProps)) {
                this.setState({
                    newSystem: null,
                    hasChanges: false,
                });
            }
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <div className="settings-page">
                {this.renderButtons()}
                <h2>{t('settings-title')}</h2>
                {this.renderForm()}
                {this.renderInstructions()}
            </div>
        );
    },

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        if (this.isEditing()) {
            // using keys here to force clearing of focus
            return (
                <div key="edit" className="buttons">
                    <PushButton className="cancel" onClick={this.handleCancelClick}>
                        {t('settings-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('settings-save')}
                    </PushButton>
                    <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
                </div>
            );
        } else {
            return (
                <div key="view" className="buttons">
                    <PushButton className="edit" onClick={this.handleEditClick}>
                        {t('settings-edit')}
                    </PushButton>
                </div>
            );
        }
    },

    /**
     * Render form for entering system settings
     *
     * @return {ReactElement}
     */
    renderForm: function() {
        var t = this.props.locale.translate;
        var readOnly = !this.isEditing();
        var systemOriginal = this.props.system;
        var system = this.getSystem();
        var inputLanguagesOriginal = _.get(systemOriginal, 'settings.input_languages');
        var inputLanguages = _.get(system, 'settings.input_languages');
        var titleProps = {
            id: 'title',
            value: system.details.title,
            availableLanguageCodes: inputLanguages,
            locale: this.props.locale,
            onChange: this.handleTitleChange,
            readOnly,
        };
        var addressProps = {
            id: 'address',
            value: system.settings.address,
            locale: this.props.locale,
            placeholder: 'https://',
            onChange: this.handleAddressChange,
            readOnly,
        };
        var relayProps = {
            id: 'relay',
            value: system.settings.push_relay,
            locale: this.props.locale,
            placeholder: 'https://',
            onChange: this.handlePushRelayChange,
            readOnly,
        };
        var descriptionProps = {
            id: 'description',
            value: system.details.description,
            availableLanguageCodes: inputLanguages,
            type: 'textarea',
            locale: this.props.locale,
            onChange: this.handleDescriptionChange,
            readOnly,
        };
        var backgroundImageProps = {
            purpose: 'background',
            resources: system.details.resources,
            database: this.props.database,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleBackgroundImageChange,
            readOnly,
        };
        var languageListProps = {
            onOptionClick: this.handleLanguageOptionClick,
            readOnly,
        };
        var languages = this.props.locale.directory;
        var languageOptionProps = _.map(languages, (language) => {
            var index = _.indexOf(inputLanguages, language.code);
            var badge;
            if (index !== -1) {
                badge = <span className="pos">{index + 1}</span>;
            }
            return {
                name: language.code,
                selected: _.includes(inputLanguages, language.code),
                previous: _.includes(inputLanguagesOriginal, language.code),
                children: <span>{language.name} {badge}</span>,
            };
        });
        return (
            <div className="form">
                <MultilingualTextField {...titleProps}>{t('settings-site-title')}</MultilingualTextField>
                <MultilingualTextField {...descriptionProps}>{t('settings-site-description')}</MultilingualTextField>
                <TextField {...addressProps}>{t('settings-site-address')}</TextField>
                <TextField {...relayProps}>{t('settings-push-relay')}</TextField>
                <ImageSelector {...backgroundImageProps}>{t('settings-background-image')}</ImageSelector>
                <OptionList {...languageListProps}>
                    <label>{t('settings-input-languages')}</label>
                    {_.map(languageOptionProps, renderOption)}
                </OptionList>
            </div>
        );
    },

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions: function() {
        var instructionProps = {
            topic: 'settings',
            hidden: !this.isEditing(),
            locale: this.props.locale,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    },

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick: function(evt) {
        return this.setEditability(true);
    },

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        return this.setEditability(false);
    },

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick: function(evt) {
        if (this.state.saving) {
            return;
        }
        this.setState({ saving: true }, () => {
            var db = this.props.database.use({ schema: 'global', by: this });
            var system = this.getSystem();
            var payloads = this.props.payloads;
            return payloads.prepare(system).then(() => {
                return db.start().then((userId) => {
                    return db.saveOne({ table: 'system' }, system).then((system) => {
                        // reattach blob, if any
                        payloads.reattach(system);
                        return payloads.dispatch(system).then(() => {
                            this.setState({ hasChanges: false, saving: false }, () => {
                                this.setEditability(false);
                            });
                            return null;
                        });
                    });
                });
            }).catch((err) => {
                console.error(err);
                this.setState({ saving: false });
            });
        });
    },

    /**
     * Called when user changes the title
     *
     * @param  {Object} evt
     */
    handleTitleChange: function(evt) {
        this.setSystemProperty(`details.title`, evt.target.value);
    },

    /**
     * Called when user changes the system address
     *
     * @param  {Event} evt
     */
    handleAddressChange: function(evt) {
        this.setSystemProperty(`settings.address`, evt.target.value);
    },

    /**
     * Called when user changes the system address
     *
     * @param  {Event} evt
     */
    handlePushRelayChange: function(evt) {
        this.setSystemProperty(`settings.push_relay`, evt.target.value);
    },

    /**
     * Called when user changes the title
     *
     * @param  {Object} evt
     */
    handleDescriptionChange: function(evt) {
        this.setSystemProperty(`details.description`, evt.target.value);
    },

    /**
     * Called when user changes the background image
     *
     * @param  {Object} evt
     */
    handleBackgroundImageChange: function(evt) {
        this.setSystemProperty(`details.resources`, evt.target.value);
    },

    /**
     * Called when user clicks an option under input languages
     *
     * @param  {Object} evt
     */
    handleLanguageOptionClick: function(evt) {
        var system = this.getSystem();
        var inputLanguages = _.slice(system.settings.input_languages);
        var lang = evt.name;
        if (_.includes(inputLanguages, lang)) {
            _.pull(inputLanguages, lang);
        } else {
            inputLanguages.push(lang);
        }
        this.setSystemProperty(`settings.input_languages`, inputLanguages);
    },
});

// use timezone to determine default relay
var defaultRelay;
var tzOffset = (new Date()).getTimezoneOffset() / 60;
if (-5 <= tzOffset && tzOffset <= 0) {
    defaultRelay = 'https://eu-west-1.push.trambar.io';
} else {
    defaultRelay = 'https://us-east-1.push.trambar.io';
}

var defaultSystem = {
    details: {},
    settings: {
        address: window.location.protocol + '//' + window.location.host,
        push_relay: defaultRelay,
    }
};

var emptySystem = {
    details: {},
    settings: {},
};

function renderOption(props, i) {
    return <option key={i} {...props} />;
}
