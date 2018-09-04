import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import PushButton from 'widgets/push-button';
import TextField from 'widgets/text-field';

import './user-info-panel.scss';

class UserInfoPanel extends PureComponent {
    static displayName = 'UserInfoPanel';

    /**
     * Return a property of the user object
     *
     * @param  {String} path
     *
     * @return {*}
     */
    getUserProperty(path) {
        return _.get(this.props.currentUser, path);
    }

    /**
     * Change a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty(path, value) {
        if (!this.props.currentUser) {
            return;
        }
        var userAfter = _.decoupleSet(this.props.currentUser, path, value);
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                user: userAfter
            });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var t = this.props.locale.translate;
        return (
            <SettingsPanel className="user-info">
                <header>
                    <i className="fa fa-user-circle" /> {t('settings-user-information')}
                </header>
                <body>
                    {this.renderNameInput()}
                    {this.renderEmailInput()}
                    {this.renderPhoneInput()}
                    {this.renderGenderSelector()}
                </body>
            </SettingsPanel>
        );
    }

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderNameInput() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = this.getUserProperty('details.name')
        var props = {
            id: 'name',
            value: p(name),
            locale: this.props.locale,
            onChange: this.handleNameChange,
        };
        return <TextField {...props}>{t('user-info-name')}</TextField>;
    }

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderEmailInput() {
        var t = this.props.locale.translate;
        var props = {
            id: 'email',
            value: this.getUserProperty('details.email'),
            locale: this.props.locale,
            onChange: this.handleEmailChange,
        };
        return <TextField {...props}>{t('user-info-email')}</TextField>;
    }

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderPhoneInput() {
        var t = this.props.locale.translate;
        var props = {
            id: 'email',
            value: this.getUserProperty('details.phone'),
            locale: this.props.locale,
            onChange: this.handlePhoneChange,
        };
        return <TextField {...props}>{t('user-info-phone')}</TextField>;
    }

    /**
     * Render gender select box
     *
     * @return {ReactElement}
     */
    renderGenderSelector() {
        var t = this.props.locale.translate;
        var selectProps = {
            id: 'gender',
            value: this.getUserProperty('details.gender') || '',
            size: 3,
            onChange: this.handleGenderChange,
        };
        return (
            <div className="gender-selector">
                <label htmlFor="gender">{t('user-info-gender')}</label>
                <select {...selectProps}>
                    <option value="male">{t('user-info-gender-male')}</option>
                    <option value="female">{t('user-info-gender-female')}</option>
                    <option value="">{t('user-info-gender-unspecified')}</option>
                </select>
            </div>
        );
    }

    /**
     * Called when user changes his name
     *
     * @param  {Event} evt
     */
    handleNameChange = (evt) => {
        var text = evt.target.value;
        this.setUserProperty(`details.name`, text);
    }

    /**
     * Called when user changes his email
     *
     * @param  {Event} evt
     */
    handleEmailChange = (evt) => {
        var text = evt.target.value;
        this.setUserProperty(`details.email`, text);
    }

    /**
     * Called when user changes his email
     *
     * @param  {Event} evt
     */
    handlePhoneChange = (evt) => {
        var text = evt.target.value;
        this.setUserProperty(`details.phone`, text);
    }

    /**
     * Called when user changes his gender
     *
     * @param  {Event} evt
     */
    handleGenderChange = (evt) => {
        var text = evt.target.value;
        this.setUserProperty(`details.gender`, text || undefined);
    }
}

export {
    UserInfoPanel as default,
    UserInfoPanel,
};

import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserInfoPanel.propTypes = {
        currentUser: PropTypes.object,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onChange: PropTypes.func,
    }
}
