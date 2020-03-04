import PropTypes from 'prop-types';
import RouteManager from 'relaks-route-manager';
import EnvironmentMonitor from 'common/env/environment-monitor.js';
import RemoteDataSource from 'common/data/remote-data-source.js';
import PayloadManager from 'common/transport/payload-manager.js';
import LocaleManager from 'common/locale/locale-manager.js';
import Notifier from 'common/transport/notifier.js';

import { FrontEnd } from './front-end.jsx';

FrontEnd.propTypes = {
  envMonitor: PropTypes.instanceOf(EnvironmentMonitor).isRequired,
  routeManager: PropTypes.instanceOf(RouteManager).isRequired,
  dataSource: PropTypes.instanceOf(RemoteDataSource).isRequired,
  localeManager: PropTypes.instanceOf(LocaleManager).isRequired,
  payloadManager: PropTypes.instanceOf(PayloadManager).isRequired,
  notifier: PropTypes.instanceOf(Notifier),
};

import './dialogs/__PROPTYPES__.js';
import './pages/__PROPTYPES__.js';
import './tooltips/__PROPTYPES__.js';
import './widgets/__PROPTYPES__.js';
