import React from 'react';
import { useListener } from 'relaks';
import { NotificationTypes, UserNotificationTypes } from 'common/objects/types/notification-types.js';
import { canReceiveNotification } from 'common/objects/utils/user-utils.js';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { OptionButton } from '../widgets/option-button.jsx';

import './web-alert-panel.scss';

/**
 * Panel for controlling the sending of alerts to the web browser.
 */
export function WebAlertPanel(props) {
  const { env, userDraft, repos } = props;
  const { t } = env.locale;
  const userType = userDraft.get('type');
  const types = (userType === 'admin') ? NotificationTypes : UserNotificationTypes;

  const handleOptionClick = useListener((evt) => {
    const optionName = evt.currentTarget.id;
    userDraft.toggle(`settings.web_alert.${optionName}`);
  });

  const browserIconClass = getBrowserIconClass();
  return (
    <SettingsPanel className="web-alert">
      <header>
        <div className="icon">
          <i className={browserIconClass} />
          <i className="fas fa-exclamation-circle icon-overlay" />
        </div>
        {' '}
        {t('settings-web-alert')}
      </header>
      <body>
        {types.map(renderOption)}
      </body>
    </SettingsPanel>
  );

  function renderOption(type, index) {
    const optionName = type.replace(/-/g, '_');
    const notificationEnabled = userDraft.get(`settings.notification.${optionName}`, false);
    const alertEnabled = userDraft.get(`settings.web_alert.${optionName}`, false);
    const canReceive = canReceiveNotification(userDraft.current, repos, type);
    const buttonProps = {
      label: t(`notification-option-${type}`),
      selected: alertEnabled && notificationEnabled,
      hidden: !canReceive,
      disabled: !notificationEnabled,
      onClick: handleOptionClick,
      id: optionName,
    };
    return <OptionButton key={index} {...buttonProps} />
  }
}

const userAgentRegExps = {
  'fab fa-edge': /(Edge|Internet Explorer)/,
  'fab fa-chrome': /Chrome/,
  'fab fa-safari': /Safari/,
  'fab fa-firefox': /Firefox/,
};

function getBrowserIconClass() {
  let ua = navigator.userAgent;
  for (let key in userAgentRegExps) {
    let re = userAgentRegExps[key];
    if (re.test(ua)) {
      return key;
    }
  }
  return 'fas fa-globe';
}
