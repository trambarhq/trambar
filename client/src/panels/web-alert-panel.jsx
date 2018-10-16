import _ from 'lodash';
import React, { PureComponent } from 'react';
import NotificationTypes, { AdminNotificationTypes } from 'objects/types/notification-types';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import OptionButton from 'widgets/option-button';

import './web-alert-panel.scss';

/**
 * Panel for controlling the sending of alerts to the web browser.
 *
 * @extends PureComponent
 */
class WebAlertPanel extends PureComponent {
    static displayName = 'WebAlertPanel';

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
        let browserIcon = getBrowserIcon();
        return (
            <SettingsPanel className="web-alert">
                <header>
                    <div className="icon">
                        <i className={`fa fa-${browserIcon}`} />
                        <i className="fa fa-exclamation-circle icon-overlay" />
                    </div>
                    {' '}
                    {t('settings-web-alert')}
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
        return _.map(types, (type, index) => {
            return this.renderOption(type, index);
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
        let alertEnabled = !!_.get(settings, `web_alert.${optionName}`);
        let canReceive = UserUtils.canReceiveNotification(currentUser, repos, type);
        let buttonProps = {
            label: t(`notification-option-${type}`),
            selected: alertEnabled && notificationEnabled,
            hidden: !canReceive,
            disabled: !notificationEnabled,
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
        let optionPath = `web_alert.${optionName}`;
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

let userAgentRegExps = {
    'edge': /(Edge|Internet Explorer)/,
    'chrome': /Chrome/,
    'safari': /Safari/,
    'firefox': /Firefox/,
};

function getBrowserIcon() {
    let ua = navigator.userAgent;
    for (let key in userAgentRegExps) {
        let re = userAgentRegExps[key];
        if (re.test(ua)) {
            return key;
        }
    }
    return 'globe';
}

export {
    WebAlertPanel as default,
    WebAlertPanel,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    WebAlertPanel.propTypes = {
        currentUser: PropTypes.object,
        env: PropTypes.instanceOf(Environment).isRequired,
        onChange: PropTypes.func,
    };
}
