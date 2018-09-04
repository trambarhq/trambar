import _ from 'lodash';
import React, { PureComponent } from 'react';
import NotificationTypes from 'objects/types/notification-types';
import UserUtils from 'objects/utils/user-utils';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import OptionButton from 'widgets/option-button';

import './web-alert-panel.scss';

class WebAlertPanel extends PureComponent {
    static displayName = 'WebAlertPanel';

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
        var browserIcon = getBrowserIcon();
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
        var types = NotificationTypes;
        var userType = _.get(this.props.currentUser, 'type');
        if (userType !== 'admin') {
            types = _.without(types, NotificationTypes.admin);
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
        var t = this.props.locale.translate;
        var optionName = _.snakeCase(type);
        var settings = _.get(this.props.currentUser, 'settings', {});
        var notificationEnabled = !!_.get(settings, `notification.${optionName}`);
        var alertEnabled = !!_.get(settings, `web_alert.${optionName}`);
        var canReceive = UserUtils.canReceiveNotification(this.props.currentUser, this.props.repos, type);
        var buttonProps = {
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
        var optionName = evt.currentTarget.id;
        var optionPath = `web_alert.${optionName}`;
        var settings = _.clone(_.get(this.props.currentUser, 'settings', {}));
        var enabled = !!_.get(settings, optionPath);
        if (enabled) {
            _.unset(settings, optionPath);
        } else {
            _.set(settings, optionPath, true);
        }
        this.setUserProperty('settings', settings);
    }
}

var userAgentRegExps = {
    'edge': /(Edge|Internet Explorer)/,
    'chrome': /Chrome/,
    'safari': /Safari/,
    'firefox': /Firefox/,
};

function getBrowserIcon() {
    var ua = navigator.userAgent;
    for (var key in userAgentRegExps) {
        var re = userAgentRegExps[key];
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

import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    WebAlertPanel.propTypes = {
        currentUser: PropTypes.object,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onChange: PropTypes.func,
    };
}
