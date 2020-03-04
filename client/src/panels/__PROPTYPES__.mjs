import PropTypes from 'prop-types';
import { AsyncSaveBuffer } from 'relaks';
import { Database } from 'common/data/database.mjs';
import { Route } from 'common/routing/route.mjs';
import { Environment } from 'common/env/environment.mjs';
import { Payloads } from 'common/transport/payloads.mjs';

import { DevelopmentPanel } from './development-panel.jsx';
import { DevicePanel } from './device-panel.jsx';
import { LanguagePanel } from './language-panel.jsx';
import { MobileAlertPanel } from './mobile-alert-panel.jsx';
import { NotificationPanel } from './notification-panel.jsx';
import { ProjectPanel } from './project-panel.jsx';
import { SocialNetworkPanel } from './social-network-panel.jsx';
import { UserImagePanel } from './user-image-panel.jsx';
import { UserInfoPanel } from './user-info-panel.jsx';
import { WebAlertPanel } from './web-alert-panel.jsx';

DevelopmentPanel.propTypes = {
  userDraft: PropTypes.instanceOf(AsyncSaveBuffer).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
DevicePanel.propTypes = {
  devices: PropTypes.arrayOf(PropTypes.object),

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
LanguagePanel.propTypes = {
  env: PropTypes.instanceOf(Environment).isRequired,
};
MobileAlertPanel.propTypes = {
  userDraft: PropTypes.instanceOf(AsyncSaveBuffer).isRequired,
  repos: PropTypes.arrayOf(PropTypes.object),
  env: PropTypes.instanceOf(Environment).isRequired,
};
NotificationPanel.propTypes = {
  userDraft: PropTypes.instanceOf(AsyncSaveBuffer).isRequired,
  repos: PropTypes.arrayOf(PropTypes.object),
  env: PropTypes.instanceOf(Environment).isRequired,
};
ProjectPanel.propTypes = {
  userDraft: PropTypes.instanceOf(AsyncSaveBuffer).isRequired,
  system: PropTypes.object,
  project: PropTypes.object,
  projectLinks: PropTypes.arrayOf(PropTypes.object),

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
SocialNetworkPanel.propTypes = {
  userDraft: PropTypes.instanceOf(AsyncSaveBuffer).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
UserImagePanel.propTypes = {
  currentUser: PropTypes.object,
  payloads: PropTypes.instanceOf(Payloads).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
  onChange: PropTypes.func,
};
UserInfoPanel.propTypes = {
  userDraft: PropTypes.instanceOf(AsyncSaveBuffer).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
WebAlertPanel.propTypes = {
  userDraft: PropTypes.instanceOf(AsyncSaveBuffer).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
