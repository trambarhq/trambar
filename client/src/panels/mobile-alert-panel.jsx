import _ from 'lodash';
import React, { useCallback } from 'react';
import { useListener } from 'relaks';
import NotificationTypes, { AdminNotificationTypes } from 'common/objects/types/notification-types.js';
import * as UserUtils from 'common/objects/utils/user-utils.js';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { OptionButton } from '../widgets/option-button.jsx';

import './mobile-alert-panel.scss';

/**
 * Panel for controling the sending of alerts to the user's mobile phone.
 */
export function MobileAlertPanel(props) {
  const { env, userDraft, repos } = props;
  const { t } = env.locale;
  let types = NotificationTypes;
  let userType = userDraft.get('type');
  if (userType !== 'admin') {
    types = _.without(types, AdminNotificationTypes);
  }
  types = _.concat(types, 'web-session');

  const handleOptionClick = useCallback((evt) => {
    const optionName = evt.currentTarget.id;
    userDraft.toggle(`settings.mobile_alert.${optionName}`);
  });

  return (
    <SettingsPanel className="mobile-alert">
      <header>
        <div className="icon">
          <i className="fas fa-tablet" />
          <i className="fas fa-exclamation-circle icon-overlay" />
        </div>
        {' '}
        {t('settings-mobile-alert')}
      </header>
      <body>
        {_.map(types, renderOption)}
      </body>
    </SettingsPanel>
  );

  function renderOption(type, index) {
    const optionName = _.snakeCase(type);
    const notificationEnabled = userDraft.get(`settings.notification.${optionName}`, false);
    const alertEnabled = userDraft.get(`settings.mobile_alert.${optionName}`, false);
    const canReceive = UserUtils.canReceiveNotification(userDraft.current, repos, type);
    const buttonProps = {
      label: t(`notification-option-${type}`),
      selected: alertEnabled && (notificationEnabled || type === 'web-session'),
      hidden: !canReceive,
      disabled: !(notificationEnabled || type === 'web-session'),
      onClick: handleOptionClick,
      id: optionName,
    };
    return <OptionButton key={index} {...buttonProps} />
  }
}
