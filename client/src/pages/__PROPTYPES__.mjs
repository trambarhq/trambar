import Database from 'common/data/database.mjs';
import Payloads from 'common/transport/payloads.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

import { SettingsPage, SettingsPageSync } from './settings-page.jsx';

SettingsPage.propTypes = {
    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
SettingsPageSync.propTypes = {
    currentUser: PropTypes.object,
    currentProject: PropTypes.object,
    projectLinks: PropTypes.arrayOf(PropTypes.object),
    repos: PropTypes.arrayOf(PropTypes.object),
    devices: PropTypes.arrayOf(PropTypes.object),
    system: PropTypes.object,

    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
