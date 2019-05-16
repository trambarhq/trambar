import { AsyncSaveBuffer } from 'relaks';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

import { DevelopmentPanel } from './development-panel.jsx';
import { LanguagePanel } from './language-panel.jsx';
import { MobileAlertPanel } from './mobile-alert-panel.jsx';

DevelopmentPanel.propTypes = {
    userDraft: PropTypes.instanceOf(AsyncSaveBuffer).isRequired,
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
WebAlertPanel.propTypes = {
    userDraft: PropTypes.instanceOf(AsyncSaveBuffer).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
