import _ from 'lodash';
import React from 'react';
import { useListener } from 'relaks';
import NotificationTypes, { AdminNotificationTypes } from 'common/objects/types/notification-types.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

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
  let types = NotificationTypes;
  if (userType !== 'admin') {
    types = _.without(types, AdminNotificationTypes);
  }

  const handleOptionClick = useListener((evt) => {
    const optionName = evt.currentTarget.id;
    userDraft.toggle(`settings.web_alert.${optionName}`);
  });

  const browserIcon = getBrowserIcon();
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
        {_.map(types, renderOption)}
      </body>
    </SettingsPanel>
  );

  function renderOption(type, index) {
    const optionName = _.snakeCase(type);
    const notificationEnabled = userDraft.get(`settings.notification.${optionName}`, false);
    const alertEnabled = userDraft.get(`settings.web_alert.${optionName}`, false);
    const canReceive = UserUtils.canReceiveNotification(userDraft.current, repos, type);
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
