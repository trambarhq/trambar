import PropTypes from 'prop-types';
import Database from 'common/data/database.mjs';
import Payloads from 'common/transport/payloads.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

import EnvironmentMonitor from 'common/env/environment-monitor.mjs';
import RouteManager from 'relaks-route-manager';
import RemoteDataSource from 'common/data/remote-data-source.mjs';
import PayloadManager from 'common/transport/payload-manager.mjs';
import LocaleManager from 'common/locale/locale-manager.mjs';
import Notifier from 'common/transport/notifier.mjs';
import CodePush from 'common/transport/code-push.mjs';

import { SettingsPage, SettingsPageSync } from './settings-page.jsx';

BookmarksPage.propTypes = {
    scrollToStoryID: PropTypes.number,
    highlightStoryID: PropTypes.number,

    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
DiagnosticsPage.propTypes = {
    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,

    envMonitor: PropTypes.instanceOf(EnvironmentMonitor).isRequired,
    dataSource: PropTypes.instanceOf(RemoteDataSource).isRequired,
    localeManager: PropTypes.instanceOf(LocaleManager).isRequired,
    payloadManager: PropTypes.instanceOf(PayloadManager).isRequired,
    notifier: PropTypes.instanceOf(Notifier),
    codePush: PropTypes.instanceOf(CodePush),
};
ErrorPage.propTypes = {
    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
NewsPage.propTypes = {
    roleIDs: PropTypes.arrayOf(PropTypes.number),
    search: PropTypes.string,
    date: PropTypes.string,
    scrollToStoryID: PropTypes.number,
    highlightStoryID: PropTypes.number,
    scrollToReactionID: PropTypes.number,
    highlightReactionID: PropTypes.number,

    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
NotificationsPage.propTypes = {
    date: PropTypes.string,
    scrollToNotificationID: PropTypes.number,

    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
PeoplePage.propTypes = {
    roleIDs: PropTypes.arrayOf(PropTypes.number),
    search: PropTypes.string,
    date: PropTypes.string,
    selectedUserID: PropTypes.number,
    scrollToUserID: PropTypes.number,
    highlightStoryID: PropTypes.number,
    scrollToStoryID: PropTypes.number,

    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
SettingsPage.propTypes = {
    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
StartPage.propTypes = {
    transitionOut: PropTypes.bool,
    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,

    onTransitionOut: PropTypes.func,
};
