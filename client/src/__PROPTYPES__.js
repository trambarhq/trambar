import PropTypes from 'prop-types';
import { EnvironmentMonitor } from 'common/env/environment-monitor.js';
import { RouteManager } from 'relaks-route-manager';
import { RemoteDataSource } from 'common/data/remote-data-source.js';
import { PayloadManager } from 'common/transport/payload-manager.js';
import { LocaleManager } from 'common/locale/locale-manager.js';
import { Notifier } from 'common/transport/notifier.js';
import { CodePush } from 'common/transport/code-push.js';

import { FrontEnd } from './front-end.jsx';

FrontEnd.propTypes = {
  envMonitor: PropTypes.instanceOf(EnvironmentMonitor).isRequired,
  dataSource: PropTypes.instanceOf(RemoteDataSource).isRequired,
  localeManager: PropTypes.instanceOf(LocaleManager).isRequired,
  payloadManager: PropTypes.instanceOf(PayloadManager).isRequired,
  notifier: PropTypes.instanceOf(Notifier),
  codePush: PropTypes.instanceOf(CodePush),
};

import './diagnostics/__PROPTYPES__.js';
import './dialogs/__PROPTYPES__.js';
import './editors/__PROPTYPES__.js';
import './lists/__PROPTYPES__.js';
import './pages/__PROPTYPES__.js';
import './panels/__PROPTYPES__.js';
import './views/__PROPTYPES__.js';
import './widgets/__PROPTYPES__.js';
