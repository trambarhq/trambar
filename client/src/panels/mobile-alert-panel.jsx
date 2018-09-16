import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as NotificationTypes from 'objects/types/notification-types';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import OptionButton from 'widgets/option-button';

require('./mobile-alert-panel.scss');

class MobileAlertPanel extends PureComponent {
    static displayName = 'MobileAlertPanel';

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
        let types = NotificationTypes;
        let userType = _.get(this.props.currentUser, 'type');
        if (userType !== 'admin') {
            types = _.without(types, NotificationTypes.admin);
        }
        types = _.concat(types, 'web-session');
        return _.map(types, this.renderOption);
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
        let t = this.props.locale.translate;
        let optionName = _.snakeCase(type);
        let settings = _.get(this.props.currentUser, 'settings', {});
        let notificationEnabled = !!_.get(settings, `notification.${optionName}`);
        let alertEnabled = !!_.get(settings, `mobile_alert.${optionName}`);
        let canReceive = UserUtils.canReceiveNotification(this.props.currentUser, this.props.repos, type);
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
        let optionName = evt.currentTarget.id;
        let optionPath = `mobile_alert.${optionName}`;
        let settings = _.clone(_.get(this.props.currentUser, 'settings', {}));
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

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MobileAlertPanel.propTypes = {
        currentUser: PropTypes.object,
        env: PropTypes.instanceOf(Environment).isRequired,
        onChange: PropTypes.func,
    }
}
