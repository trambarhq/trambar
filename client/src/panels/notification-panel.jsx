import React from 'react';
import { useListener } from 'relaks';
import { NotificationTypes, UserNotificationTypes } from 'common/objects/types/notification-types.js';
import { canReceiveNotification } from 'common/objects/utils/user-utils.js';
import { get, set, unset, cloneDeep } from 'common/utils/object-utils.js';

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
  const types = (userType === 'admin') ? NotificationTypes : UserNotificationTypes;

  const handleOptionClick = useListener((evt) => {
    const optionName = evt.currentTarget.id;
    const optionPaths = [
      `notification.${optionName}`,
      `web_alert.${optionName}`,
      `mobile_alert.${optionName}`,
    ];
    const settingsBefore = userDraft.get('settings', {});
    const settings = cloneDeep(settingsBefore);
    const enabled = !get(settings, optionPaths[0]);
    for (let optionPath of optionPaths) {
      if (!enabled) {
        unset(settings, optionPath);
      } else {
        if (optionPath === 'notification.merge') {
          set(settings, optionPath, 'master');
        } else {
          set(settings, optionPath, true);
        }
      }
    }
    userDraft.set('settings', settings);
  });

  return (
    <SettingsPanel className="notification">
      <header>
        <i className="fas fa-exclamation-circle" /> {t('settings-notification')}
      </header>
      <body>
        {types.map(renderOption)}
      </body>
    </SettingsPanel>
  );

  function renderOption(type, index) {
    const optionName = type.replace(/-/g, '_');
    const enabled = userDraft.get(`settings.notification.${optionName}`, false);
    const canReceive = canReceiveNotification(userDraft.current, repos, type);
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
