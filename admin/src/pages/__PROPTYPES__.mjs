import PropTypes from 'prop-types';
import { Database } from 'common/data/database.mjs';
import { Route } from 'common/routing/route.mjs';
import { Environment } from 'common/env/environment.mjs';
import { Payloads } from 'common/transport/payloads.mjs';

import { ErrorPage } from './error-page.jsx';
import { MemberListPage } from './member-list-page.jsx';
import { ProjectListPage } from './project-list-page.jsx';
import { ProjectSummaryPage } from './project-summary-page.jsx';
import { RepoListPage } from './repo-list-page.jsx';
import { RepoSummaryPage } from './repo-summary-page.jsx';
import { RoleListPage } from './role-list-page.jsx';
import { RoleSummaryPage } from './role-summary-page.jsx';
import { ServerListPage } from './server-list-page.jsx';
import { ServerSummaryPage } from './server-summary-page.jsx';
import { StartPage } from './start-page.jsx';
import { SettingsPage } from './settings-page.jsx';
import { SignInPage } from './sign-in-page.jsx';
import { UserListPage } from './user-list-page.jsx';
import { UserSummaryPage } from './user-summary-page.jsx';

ErrorPage.propTypes = {
  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
MemberListPage.propTypes = {
  editing: PropTypes.bool,
  projectID: PropTypes.number.isRequired,

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
ProjectListPage.propTypes = {
  editing: PropTypes.bool,

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
ProjectSummaryPage.propTypes = {
  editing: PropTypes.bool,
  projectID: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.oneOf([ 'new' ]),
  ]).isRequired,

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
  payloads: PropTypes.instanceOf(Payloads).isRequired,
};
RepoListPage.propTypes = {
  editing: PropTypes.bool,
  projectID: PropTypes.number.isRequired,

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
RepoSummaryPage.propTypes = {
  editing: PropTypes.bool,
  projectID: PropTypes.number.isRequired,
  repoID: PropTypes.number.isRequired,

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
RoleListPage.propTypes = {
  editing: PropTypes.bool,
  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
RoleSummaryPage.propTypes = {
  editing: PropTypes.bool,
  roleID: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.oneOf([ 'new' ]),
  ]).isRequired,

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
ServerListPage.propTypes = {
  editing: PropTypes.bool,
  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
ServerSummaryPage.propTypes = {
  editing: PropTypes.bool,
  serverID: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.oneOf([ 'new' ]),
  ]).isRequired,
  scrollToTaskID: PropTypes.number,

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
SettingsPage.propTypes = {
  editing: PropTypes.bool,

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
  payloads: PropTypes.instanceOf(Payloads).isRequired,
};
SignInPage.propTypes = {
  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
StartPage.propTypes = {
  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
UserListPage.propTypes = {
  editing: PropTypes.bool,
  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};
UserSummaryPage.propTypes = {
  editing: PropTypes.bool,
  projectID: PropTypes.number,
  userID: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.oneOf([ 'new' ]),
  ]).isRequired,

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
  payloads: PropTypes.instanceOf(Payloads).isRequired,
};
