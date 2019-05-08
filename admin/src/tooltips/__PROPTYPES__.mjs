import PropTypes from 'prop-types';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

import { ActivityTooltip } from 'activity-tooltip';

ActivityTooltip.propTypes = {
    statistics: PropTypes.object,
    env: PropTypes.instanceOf(Environment),
};
ModifiedTimeTooltip.propTypes = {
    time: PropTypes.string,
    disabled: PropTypes.bool,
    env: PropTypes.instanceOf(Environment).isRequired,
};
ProjectTooltip.propTypes = {
    projects: PropTypes.arrayOf(PropTypes.object),
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
RepositoryTooltip.propTypes = {
    repos: PropTypes.arrayOf(PropTypes.object),
    project: PropTypes.object.isRequired,
    route: PropTypes.object.isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
    disabled: PropTypes.bool,
};
RoleTooltip.propTypes = {
    roles: PropTypes.arrayOf(PropTypes.object),
    disabled: PropTypes.bool,
    route: PropTypes.object.isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
UserTooltip.propTypes = {
    users: PropTypes.arrayOf(PropTypes.object),
    project: PropTypes.object,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
    disabled: PropTypes.bool,
};
