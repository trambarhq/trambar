import PropTypes from 'prop-types';
import EnvironmentMonitor from 'common/env/environment-monitor.mjs';
import RouteManager from 'relaks-route-manager';
import RemoteDataSource from 'common/data/remote-data-source.mjs';
import PayloadManager from 'common/transport/payload-manager.mjs';
import LocaleManager from 'common/locale/locale-manager.mjs';
import Notifier from 'common/transport/notifier.mjs';
import CodePush from 'common/transport/code-push.mjs';

import { FrontEnd } from './front-end.jsx';

FrontEnd.propTypes = {
  envMonitor: PropTypes.instanceOf(EnvironmentMonitor).isRequired,
  dataSource: PropTypes.instanceOf(RemoteDataSource).isRequired,
  localeManager: PropTypes.instanceOf(LocaleManager).isRequired,
  payloadManager: PropTypes.instanceOf(PayloadManager).isRequired,
  notifier: PropTypes.instanceOf(Notifier),
  codePush: PropTypes.instanceOf(CodePush),
};
