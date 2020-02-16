import PropTypes from 'prop-types';
import { Route } from 'common/routing/route.mjs';
import { Environment } from 'common/env/environment.mjs';

import { ActivityTooltip } from './activity-tooltip.jsx';
import { ModifiedTimeTooltip } from './modified-time-tooltip.jsx';
import { ProjectTooltip } from './project-tooltip.jsx';
import { RepositoryTooltip } from './repository-tooltip.jsx';
import { RoleTooltip } from './role-tooltip.jsx';
import { UserTooltip } from './user-tooltip.jsx';

ActivityTooltip.propTypes = {
  statistics: PropTypes.object,
  disabled: PropTypes.bool.isRequired,
  env: PropTypes.instanceOf(Environment),
};
ModifiedTimeTooltip.propTypes = {
  time: PropTypes.string,
  disabled: PropTypes.bool.isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
ProjectTooltip.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object),
  disabled: PropTypes.bool.isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
RepositoryTooltip.propTypes = {
  repos: PropTypes.arrayOf(PropTypes.object),
  project: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
  route: PropTypes.object.isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
RoleTooltip.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.object),
  disabled: PropTypes.bool.isRequired,
  route: PropTypes.object.isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
UserTooltip.propTypes = {
  users: PropTypes.arrayOf(PropTypes.object),
  project: PropTypes.object,
  disabled: PropTypes.bool.isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
  disabled: PropTypes.bool,
};
