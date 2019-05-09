import PropTypes from 'prop-types';
import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

import { ErrorPage } from 'error-page.jsx';
import { MemberListPage } from 'member-list-page.jsx';

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
RoleListPage.propTypes = {
    editing: PropTypes.bool,
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
