import _ from 'lodash';
import React, { PureComponent } from 'react';
import NotificationTypes from 'objects/types/notification-types';
import UserUtils from 'objects/utils/user-utils';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import OptionButton from 'widgets/option-button';

import './notification-panel.scss';

class NotificationPanel extends PureComponent {
    static displayName = 'NotificationPanel';

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
            <SettingsPanel className="notification">
                <header>
                    <i className="fa fa-exclamation-circle" /> {t('settings-notification')}
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
        var enabled = !!_.get(settings, `notification.${optionName}`);
        var canReceive = UserUtils.canReceiveNotification(this.props.currentUser, this.props.repos, type);
        var buttonProps = {
            label: t(`notification-option-${type}`),
            selected: enabled,
            hidden: !canReceive,
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
        var optionPaths = [
            `notification.${optionName}`,
            `web_alert.${optionName}`,
            `mobile_alert.${optionName}`,
        ];
        var settings = _.clone(_.get(this.props.currentUser, 'settings', {}));
        var enabled = !!_.get(settings, optionPaths[0]);
        _.each(optionPaths, (optionPath, index) => {
            if (enabled) {
                _.unset(settings, optionPath);
            } else {
                if (index === 0 && optionName === 'merge') {
                    _.set(settings, optionPath, 'master');
                } else {
                    _.set(settings, optionPath, true);
                }
            }
        });
        this.setUserProperty('settings', settings);
    }
}

export {
    NotificationPanel as default,
    NotificationPanel,
};

import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NotificationPanel.propTypes = {
        currentUser: PropTypes.object,
        repos: PropTypes.arrayOf(PropTypes.object),
        locale: PropTypes.instanceOf(Locale).isRequired,
        onChange: PropTypes.func,
    };
}
