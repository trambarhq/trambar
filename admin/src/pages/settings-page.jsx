var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var SystemSettings = require('objects/settings/system-settings');

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
        parseURL: function(path, query, hash) {
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
        getURL: function(params) {
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
     * @param  {Object} prevProps
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile, prevProps) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', by: this });
        var delay = (this.props.route !== prevProps.route) ? 100 : 1000;
        var props = {
            system: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
        };
        meanwhile.show(<SettingsPageSync {...props} />, delay);
        return db.start().then((userId) => {
            var criteria = {
                deleted: false
            };
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
     * @param  {String} state
     *
     * @return {Object}
     */
    getSystem: function(state) {
        if (this.isEditing() && (!state || state === 'current')) {
            return this.state.newSystem || this.props.system || defaultSystem;
        } else {
            return this.props.system || emptySystem;
        }
    },

    /**
     * Return a property of the system object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getSystemProperty: function(path, state) {
        var system = this.getSystem(state);
        return _.get(system, path);
    },

    /**
     * Modify a property of the system object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setSystemProperty: function(path, value) {
        var system = this.getSystem('current');
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
     * Return list of language codes
     *
     * @return {Array<String>}
     */
    getInputLanguages: function() {
        var system = this.getSystem();
        return _.get(system, 'settings.input_languages', [])
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
                    <PushButton onClick={this.handleCancelClick}>
                        {t('settings-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('settings-save')}
                    </PushButton>
                    <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
                </div>
            );
        } else {
            return (
                <div key="view" className="buttons">
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
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
        return (
            <div className="form">
                {this.renderTitleInput()}
                {this.renderDescriptionInput()}
                {this.renderSiteAddressInput()}
                {this.renderPushRelayInput()}
                {this.renderBackgroundSelector()}
                {this.renderInputLanguageSelector()}
            </div>
        );
    },

    /**
     * Render title input
     *
     * @return {ReactElement}
     */
    renderTitleInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'title',
            value: this.getSystemProperty('details.title'),
            availableLanguageCodes: this.getInputLanguages(),
            locale: this.props.locale,
            onChange: this.handleTitleChange,
            readOnly: !this.isEditing(),
        };
        return (
            <MultilingualTextField {...props}>
                {t('settings-site-title')}
            </MultilingualTextField>
        );
    },

    /**
     * Render description input
     *
     * @return {ReactElement}
     */
    renderDescriptionInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'description',
            value: this.getSystemProperty('details.description'),
            availableLanguageCodes: this.getInputLanguages(),
            type: 'textarea',
            locale: this.props.locale,
            onChange: this.handleDescriptionChange,
            readOnly: !this.isEditing(),
        };
        return (
            <MultilingualTextField {...props}>
                {t('settings-site-description')}
            </MultilingualTextField>
        )
    },

    /**
     * Render site address input
     *
     * @return {ReactElement}
     */
    renderSiteAddressInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'address',
            value: this.getSystemProperty('settings.address'),
            locale: this.props.locale,
            placeholder: 'https://',
            onChange: this.handleAddressChange,
            readOnly: !this.isEditing(),
        };
        return (
            <TextField {...props}>
                {t('settings-site-address')}
            </TextField>
        );
    },

    /**
     * Render push relay input
     *
     * @return {ReactElement}
     */
    renderPushRelayInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'relay',
            value: this.getSystemProperty('settings.push_relay'),
            locale: this.props.locale,
            placeholder: 'https://',
            onChange: this.handlePushRelayChange,
            readOnly: !this.isEditing(),
        };
        return (
            <TextField {...props}>
                {t('settings-push-relay')}
            </TextField>
        );
    },

    /**
     * Render background image selector
     *
     * @return {ReactElement}
     */
    renderBackgroundSelector: function() {
        var t = this.props.locale.translate;
        var props = {
            purpose: 'background',
            resources: this.getSystemProperty('details.resources'),
            database: this.props.database,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleBackgroundImageChange,
            readOnly: !this.isEditing(),
        };
        return (
            <ImageSelector {...props}>
                {t('settings-background-image')}
            </ImageSelector>
        );
    },

    /**
     * Render input language selector
     *
     * @return {ReactElement}
     */
    renderInputLanguageSelector: function() {
        var t = this.props.locale.translate;
        var languages = this.props.locale.directory;
        var inputLanguageCurr = this.getSystemProperty('settings.input_languages', 'current') || [];
        var inputLanguagePrev = this.getSystemProperty('settings.input_languages', 'original') || [];
        var optionProps = _.map(languages, (language) => {
            var index = _.indexOf(inputLanguageCurr, language.code);
            var badge;
            if (index !== -1) {
                badge = <span className="pos">{index + 1}</span>;
            }
            return {
                name: language.code,
                selected: _.includes(inputLanguageCurr, language.code),
                previous: _.includes(inputLanguagePrev, language.code),
                children: <span>{language.name} {badge}</span>,
            };
        });
        var listProps = {
            onOptionClick: this.handleLanguageOptionClick,
            readOnly: !this.isEditing(),
        };
        return (
            <OptionList {...listProps}>
                <label>{t('settings-input-languages')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
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
            var schema = 'global';
            var db = this.props.database.use({ schema, by: this });
            var system = this.getSystem();
            return db.start().then((userId) => {
                return db.saveOne({ table: 'system' }, system).then((system) => {
                    this.props.payloads.dispatch(system);
                    this.setState({ hasChanges: false, saving: false }, () => {
                        this.setEditability(false);
                    });
                    return null;
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
    settings: SystemSettings.default,
};

function renderOption(props, i) {
    return <option key={i} {...props} />;
}
