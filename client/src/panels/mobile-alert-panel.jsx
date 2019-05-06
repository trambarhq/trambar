import _ from 'lodash';
import React, { PureComponent } from 'react';
import NotificationTypes, { AdminNotificationTypes } from 'common/objects/types/notification-types.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import SettingsPanel from '../widgets/settings-panel.jsx';
import OptionButton from '../widgets/option-button.jsx';

import './mobile-alert-panel.scss';

/**
 * Panel for controling the sending of alerts to the user's mobile phone.
 *
 * @extends PureComponent
 */
class MobileAlertPanel extends PureComponent {
    static displayName = 'MobileAlertPanel';

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
            <SettingsPanel className="mobile-alert">
                <header>
                    <div className="icon">
                        <i className="fa fa-tablet" />
                        <i className="fa fa-exclamation-circle icon-overlay" />
                    </div>
                    {' '}
                    {t('settings-mobile-alert')}
                </header>
                <body>
                    {this.renderOptions()}
                </body>
            </SettingsPanel>
        );
    }

    /**
     * Render notification options
     *
     * @return {Array<ReactElement>}
     */
    renderOptions() {
        let { currentUser } = this.props;
        let types = NotificationTypes;
        let userType = _.get(currentUser, 'type');
        if (userType !== 'admin') {
            types = _.without(types, AdminNotificationTypes);
        }
        types = _.concat(types, 'web-session');
        return _.map(types, (type, i) => {
            return this.renderOption(type, i);
        });
    }

    /**
     * Render notification option button
     *
     * @param  {String} type
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderOption(type, index) {
        let { env, currentUser, repos } = this.props;
        let { t } = env.locale;
        let optionName = _.snakeCase(type);
        let settings = _.get(currentUser, 'settings', {});
        let notificationEnabled = !!_.get(settings, `notification.${optionName}`);
        let alertEnabled = !!_.get(settings, `mobile_alert.${optionName}`);
        let canReceive = UserUtils.canReceiveNotification(currentUser, repos, type);
        let buttonProps = {
            label: t(`notification-option-${type}`),
            selected: alertEnabled && (notificationEnabled || type === 'web-session'),
            hidden: !canReceive,
            disabled: !(notificationEnabled || type === 'web-session'),
            onClick: this.handleOptionClick,
            id: optionName,
        };
        return <OptionButton key={index} {...buttonProps} />
    }

    /**
     * Called when an option is clicked
     */
    handleOptionClick = (evt) => {
        let { currentUser } = this.props;
        let optionName = evt.currentTarget.id;
        let optionPath = `mobile_alert.${optionName}`;
        let settings = _.clone(_.get(currentUser, 'settings', {}));
        let enabled = !!_.get(settings, optionPath);
        if (enabled) {
            _.unset(settings, optionPath);
        } else {
            _.set(settings, optionPath, true);
        }
        this.setUserProperty('settings', settings);
    }
}

export {
    MobileAlertPanel as default,
    MobileAlertPanel,
};

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MobileAlertPanel.propTypes = {
        currentUser: PropTypes.object,
        env: PropTypes.instanceOf(Environment).isRequired,
        onChange: PropTypes.func,
    }
}
