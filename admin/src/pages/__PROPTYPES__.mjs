import PropTypes from 'prop-types';
import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

import { ErrorPage } from './error-page.jsx';
import { MemberListPage } from './member-list-page.jsx';
import { ProjectListPage } from './project-list-page.jsx';
import { RepoListPage } from './repo-list-page.jsx';
import { RepoSummaryPage } from './repo-summary-page.jsx';
import { RoleListPage } from './role-list-page.jsx';
import { RoleSummaryPage } from './role-summary-page.jsx';
import { ServerListPage } from './server-list-page.jsx';
import { StartPage } from './start-page.jsx';
import { SignInPage } from './sign-in-page.jsx';
import { UserListPage } from './user-list-page.jsx';

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
