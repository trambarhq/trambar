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
        let userAfter = _.decoupleSet(this.props.currentUser, path, value);
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
        let t = this.props.locale.translate;
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
        let t = this.props.locale.translate;
        let p = this.props.locale.pick;
        let name = this.getUserProperty('details.name')
        let props = {
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
        let t = this.props.locale.translate;
        let props = {
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
        let t = this.props.locale.translate;
        let props = {
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
        let t = this.props.locale.translate;
        let selectProps = {
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
        let text = evt.target.value;
        this.setUserProperty(`details.name`, text);
    }

    /**
     * Called when user changes his email
     *
     * @param  {Event} evt
     */
    handleEmailChange = (evt) => {
        let text = evt.target.value;
        this.setUserProperty(`details.email`, text);
    }

    /**
     * Called when user changes his email
     *
     * @param  {Event} evt
     */
    handlePhoneChange = (evt) => {
        let text = evt.target.value;
        this.setUserProperty(`details.phone`, text);
    }

    /**
     * Called when user changes his gender
     *
     * @param  {Event} evt
     */
    handleGenderChange = (evt) => {
        let text = evt.target.value;
        this.setUserProperty(`details.gender`, text || undefined);
    }
}

export {
    UserInfoPanel as default,
    UserInfoPanel,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserInfoPanel.propTypes = {
        currentUser: PropTypes.object,
        env: PropTypes.instanceOf(Environment).isRequired,
        onChange: PropTypes.func,
    }
}
