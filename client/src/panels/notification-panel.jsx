import _ from 'lodash';
import React from 'react';
import { useListener } from 'relaks';
import NotificationTypes, { AdminNotificationTypes } from 'common/objects/types/notification-types.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { OptionButton } from '../widgets/option-button.jsx';

import './notification-panel.scss';

/**
 * Panel for controlling which events generate notifications.
 */
export function NotificationPanel(props) {
  const { env, userDraft, repos } = props;
  const { t } = env.locale;
  const userType = userDraft.get('type');
  let types = NotificationTypes;
  if (userType !== 'admin') {
    types = _.without(types, AdminNotificationTypes);
  }

  const handleOptionClick = useListener((evt) => {
    const optionName = evt.currentTarget.id;
    const optionPaths = [
      `notification.${optionName}`,
      `web_alert.${optionName}`,
      `mobile_alert.${optionName}`,
    ];
    const settingsBefore = userDraft.get('settings', {});
    const settings = { ...settingsBefore };
    const enabled = !_.get(settings, optionPaths[0]);
    for (let optionPath of optionPaths) {
      if (!enabled) {
        _.unset(settings, optionPath);
      } else {
        if (optionPath === 'notification.merge') {
          _.set(settings, optionPath, 'master');
        } else {
          _.set(settings, optionPath, true);
        }
      }
    }
    userDraft.set('settings', settings);
  });

  return (
    <SettingsPanel className="notification">
      <header>
        <i className="fa fa-exclamation-circle" /> {t('settings-notification')}
      </header>
      <body>
        {_.map(types, renderOption)}
      </body>
    </SettingsPanel>
  );

  function renderOption(type, index) {
    const optionName = _.snakeCase(type);
    const enabled = userDraft.get(`settings.notification.${optionName}`, false);
    const canReceive = UserUtils.canReceiveNotification(userDraft.current, repos, type);
    const buttonProps = {
      label: t(`notification-option-${type}`),
      selected: enabled,
      hidden: !canReceive,
      onClick: handleOptionClick,
      id: optionName,
    };
    return <OptionButton key={index} {...buttonProps} />
  }
}
