import PropTypes from 'prop-types';
import RouteManager from 'relaks-route-manager';
import EnvironmentMonitor from 'common/env/environment-monitor.mjs';
import RemoteDataSource from 'common/data/remote-data-source.mjs';
import PayloadManager from 'common/transport/payload-manager.mjs';
import LocaleManager from 'common/locale/locale-manager.mjs';
import Notifier from 'common/transport/notifier.mjs';

import { FrontEnd } from './front-end.jsx';

FrontEnd.propTypes = {
    envMonitor: PropTypes.instanceOf(EnvironmentMonitor).isRequired,
    routeManager: PropTypes.instanceOf(RouteManager).isRequired,
    dataSource: PropTypes.instanceOf(RemoteDataSource).isRequired,
    localeManager: PropTypes.instanceOf(LocaleManager).isRequired,
    payloadManager: PropTypes.instanceOf(PayloadManager).isRequired,
    notifier: PropTypes.instanceOf(Notifier),
};

import './dialogs/__PROPTYPES__.mjs';
import './pages/__PROPTYPES__.mjs';
import './tooltips/__PROPTYPES__.mjs';
import './widgets/__PROPTYPES__.mjs';
