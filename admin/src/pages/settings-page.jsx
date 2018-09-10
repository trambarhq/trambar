import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import SystemFinder from 'objects/finders/system-finder';
import SystemSettings from 'objects/settings/system-settings';

// widgets
import PushButton from 'widgets/push-button';
import InstructionBlock from 'widgets/instruction-block';
import TextField from 'widgets/text-field';
import MultilingualTextField from 'widgets/multilingual-text-field';
import OptionList from 'widgets/option-list';
import ImageSelector from 'widgets/image-selector';
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';

import './settings-page.scss';

class SettingsPage extends AsyncComponent {
    static displayName = 'SettingsPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env, payloads } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            system: null,

            database,
            route,
            env,
            payloads,
        };
        meanwhile.show(<SettingsPageSync {...props} />);
        return db.start().then((currentUserID) => {
            return SystemFinder.findSystem(db).then((system) => {
                props.system = _.isEmpty(system) ? null : system;
            });
        }).then(() => {
            return <SettingsPageSync {...props} />;
        });
    }
}

class SettingsPageSync extends PureComponent {
    static displayName = 'SettingsPage.Sync';

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    constructor(props) {
        super(props);
        this.state = {
            newSystem: null,
            saving: false,
            problems: {},
        };
    }

    /**
     * Return edited copy of system object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getSystem(state) {
        let { system } = this.props;
        let { newSystem } = this.state;
        if (this.isEditing() && (!state || state === 'current')) {
            return newSystem || system || defaultSystem;
        } else {
            return system || emptySystem;
        }
    }

    /**
     * Return a property of the system object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getSystemProperty(path, state) {
        let system = this.getSystem(state);
        return _.get(system, path);
    }

    /**
     * Modify a property of the system object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setSystemProperty(path, value) {
        let { system } = this.props;
        let newSystem = this.getSystem('current');
        let newSystemAfter = _.decoupleSet(newSystem, path, value);
        let hasChanges = true;
        if (_.isEqual(newSystemAfter, system)) {
            newSystemAfter = null;
            hasChanges = false;
        }
        this.setState({ newSystem: newSystemAfter, hasChanges });
    }

    /**
     * Return true when the URL indicate edit mode
     *
     * @param  {Object} props
     *
     * @return {Boolean}
     */
    isEditing(props) {
        let { route } = props || this.props;
        return route.params.edit;
    }

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     *
     * @return {Promise}
     */
    setEditability(edit) {
        let { route } = this.props;
        let params = _.clone(route.params);
        params.edit = edit;
        return route.replace(route.name, params);
    }

    /**
     * Return list of language codes
     *
     * @return {Array<String>}
     */
    getInputLanguages() {
        let system = this.getSystem();
        return _.get(system, 'settings.input_languages', [])
    }

    /**
     * Reset edit state when edit starts
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            if (this.isEditing(nextProps)) {
                this.setState({
                    newSystem: null,
                    hasChanges: false,
                });
            } else {
                this.setState({ problems: {} });
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        return (
            <div className="settings-page">
                {this.renderButtons()}
                <h2>{t('settings-title')}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {this.renderForm()}
                {this.renderInstructions()}
            </div>
        );
    }

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { route, env } = this.props;
        let { hasChanges } = this.state;
        let { t } = env.locale;
        if (this.isEditing()) {
            // using keys here to force clearing of focus
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('settings-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('settings-save')}
                    </PushButton>
                    <DataLossWarning changes={hasChanges} env={env} route={route} />
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
    }

    /**
     * Render form for entering system settings
     *
     * @return {ReactElement}
     */
    renderForm() {
        return (
            <div className="form">
                {this.renderTitleInput()}
                {this.renderCompanyNameInput()}
                {this.renderDescriptionInput()}
                {this.renderSiteAddressInput()}
                {this.renderPushRelayInput()}
                {this.renderBackgroundSelector()}
                {this.renderInputLanguageSelector()}
            </div>
        );
    }

    /**
     * Render title input
     *
     * @return {ReactElement}
     */
    renderTitleInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'title',
            value: this.getSystemProperty('details.title'),
            availableLanguageCodes: this.getInputLanguages(),
            readOnly: !this.isEditing(),
            env,
            onChange: this.handleTitleChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('settings-site-title')}
            </MultilingualTextField>
        );
    }

    /**
     * Render company name input
     *
     * @return {ReactElement}
     */
    renderCompanyNameInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'company_name',
            value: this.getSystemProperty('details.company_name'),
            readOnly: !this.isEditing(),
            env,
            onChange: this.handleCompanyNameChange,
        };
        return (
            <TextField {...props}>
                {t('settings-company-name')}
            </TextField>
        );
    }

    /**
     * Render description input
     *
     * @return {ReactElement}
     */
    renderDescriptionInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'description',
            value: this.getSystemProperty('details.description'),
            availableLanguageCodes: this.getInputLanguages(),
            type: 'textarea',
            readOnly: !this.isEditing(),
            env,
            onChange: this.handleDescriptionChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('settings-site-description')}
            </MultilingualTextField>
        )
    }

    /**
     * Render site address input
     *
     * @return {ReactElement}
     */
    renderSiteAddressInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'address',
            type: 'url',
            value: this.getSystemProperty('settings.address'),
            placeholder: 'https://',
            readOnly: !this.isEditing(),
            spellCheck: false,
            env,
            onChange: this.handleAddressChange,
        };
        return (
            <TextField {...props}>
                {t('settings-site-address')}
            </TextField>
        );
    }

    /**
     * Render push relay input
     *
     * @return {ReactElement}
     */
    renderPushRelayInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'relay',
            type: 'url',
            value: this.getSystemProperty('settings.push_relay'),
            placeholder: 'https://',
            readOnly: !this.isEditing(),
            spellCheck: false,
            env,
            onChange: this.handlePushRelayChange,
        };
        return (
            <TextField {...props}>
                {t('settings-push-relay')}
            </TextField>
        );
    }

    /**
     * Render background image selector
     *
     * @return {ReactElement}
     */
    renderBackgroundSelector() {
        let { database, env, payloads } = this.props;
        let { t } = env.locale;
        let props = {
            purpose: 'background',
            resources: this.getSystemProperty('details.resources'),
            readOnly: !this.isEditing(),
            database,
            payloads,
            env,
            onChange: this.handleBackgroundImageChange,
        };
        return (
            <ImageSelector {...props}>
                {t('settings-background-image')}
            </ImageSelector>
        );
    }

    /**
     * Render input language selector
     *
     * @return {ReactElement}
     */
    renderInputLanguageSelector() {
        let { env } = this.props;
        let { t, directory } = env.locale;
        let inputLanguageCurr = this.getSystemProperty('settings.input_languages', 'current') || [];
        let inputLanguagePrev = this.getSystemProperty('settings.input_languages', 'original') || [];
        let optionProps = _.map(directory, (language) => {
            let index = _.indexOf(inputLanguageCurr, language.code);
            let badge;
            if (index !== -1) {
                badge = <span className="language-badge">{index + 1}</span>;
            }
            return {
                name: language.code,
                selected: _.includes(inputLanguageCurr, language.code),
                previous: _.includes(inputLanguagePrev, language.code),
                children: <span>{language.name} {badge}</span>,
            };
        });
        let listProps = {
            readOnly: !this.isEditing(),
            onOptionClick: this.handleLanguageOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('settings-input-languages')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    }

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions() {
        let { env } = this.props;
        let instructionProps = {
            folder: 'settings',
            topic: 'settings',
            hidden: !this.isEditing(),
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick = (evt) => {
        return this.setEditability(true);
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        return this.setEditability(false);
    }

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick = (evt) => {
        let { database, payloads } = this.props;
        let { saving } = this.state;
        if (saving) {
            return;
        }
        this.setState({ saving: true }, () => {
            let schema = 'global';
            let db = database.use({ schema, by: this });
            let system = this.getSystem();
            return db.start().then((currentUserID) => {
                return db.saveOne({ table: 'system' }, system).then((system) => {
                    payloads.dispatch(system);
                    this.setState({ hasChanges: false, saving: false, problems: {} }, () => {
                        this.setEditability(false);
                    });
                    return null;
                });
            }).catch((err) => {
                let problems = { unexpected: err.message };
                this.setState({ problems, saving: false });
            });
        });
    }

    /**
     * Called when user changes the title
     *
     * @param  {Object} evt
     */
    handleTitleChange = (evt) => {
        this.setSystemProperty(`details.title`, evt.target.value);
    }

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleCompanyNameChange = (evt) => {
        this.setSystemProperty(`details.company_name`, evt.target.value);
    }

    /**
     * Called when user changes the system address
     *
     * @param  {Event} evt
     */
    handleAddressChange = (evt) => {
        this.setSystemProperty(`settings.address`, evt.target.value);
    }

    /**
     * Called when user changes the system address
     *
     * @param  {Event} evt
     */
    handlePushRelayChange = (evt) => {
        this.setSystemProperty(`settings.push_relay`, evt.target.value);
    }

    /**
     * Called when user changes the title
     *
     * @param  {Object} evt
     */
    handleDescriptionChange = (evt) => {
        this.setSystemProperty(`details.description`, evt.target.value);
    }

    /**
     * Called when user changes the background image
     *
     * @param  {Object} evt
     */
    handleBackgroundImageChange = (evt) => {
        this.setSystemProperty(`details.resources`, evt.target.value);
    }

    /**
     * Called when user clicks an option under input languages
     *
     * @param  {Object} evt
     */
    handleLanguageOptionClick = (evt) => {
        let system = this.getSystem();
        let inputLanguages = _.get(system, 'settings.input_languages', []);
        let lang = evt.name;
        if (_.includes(inputLanguages, lang)) {
            inputLanguages = _.without(inputLanguages, lang);
        } else {
            inputLanguages = _.concat(inputLanguages, lang);
        }
        this.setSystemProperty(`settings.input_languages`, inputLanguages);
    }
}

// use timezone to determine default relay
let defaultRelay;
let tzOffset = (new Date()).getTimezoneOffset() / 60;
if (-5 <= tzOffset && tzOffset <= 0) {
    defaultRelay = 'https://eu-west-1.push.trambar.io';
} else {
    defaultRelay = 'https://us-east-1.push.trambar.io';
}

let defaultSystem = {
    details: {},
    settings: {
        address: window.location.protocol + '//' + window.location.host,
        push_relay: defaultRelay,
    }
};

let emptySystem = {
    details: {},
    settings: SystemSettings.default,
};

function renderOption(props, i) {
    return <option key={i} {...props} />;
}

export {
    SettingsPage as default,
    SettingsPage,
    SettingsPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';
import Payloads from 'transport/payloads';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SettingsPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
    };
    SettingsPageSync.propTypes = {
        system: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
    };
}
