import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import PushButton from 'widgets/push-button';
import TextField from 'widgets/text-field';

import './user-info-panel.scss';

/**
 * Panel for entering the user's basic personal information.
 *
 * @extends PureComponent
 */
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
        let { currentUser } = this.props;
        return _.get(currentUser, path);
    }

    /**
     * Change a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty(path, value) {
        let { currentUser, onChange } = this.props;
        if (!currentUser) {
            return;
        }
        let userAfter = _.decoupleSet(currentUser, path, value);
        if (onChange) {
            onChange({
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
        let { env } = this.props;
        let { t } = env.locale;
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
        let { env } = this.props;
        let { t, p } = env.locale;
        let name = this.getUserProperty('details.name')
        let props = {
            id: 'name',
            value: p(name),
            env,
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
        let { env } = this.props;
        let { t, p } = env.locale;
        let props = {
            id: 'email',
            value: this.getUserProperty('details.email'),
            env,
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
        let { env } = this.props;
        let { t, p } = env.locale;
        let props = {
            id: 'email',
            value: this.getUserProperty('details.phone'),
            env,
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
        let { env } = this.props;
        let { t, p } = env.locale;
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
