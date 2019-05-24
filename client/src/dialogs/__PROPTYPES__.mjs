import PropTypes from 'prop-types';
import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

ActivationDialogBox.propTypes = {
    show: PropTypes.bool,

    env: PropTypes.instanceOf(Environment).isRequired,

    onConfirm: PropTypes.func,
    onCancel: PropTypes.func,
};
AppComponentDialogBox.propTypes = {
    show: PropTypes.bool,
    component: PropTypes.object,
    env: PropTypes.instanceOf(Environment).isRequired,
    onClose: PropTypes.func,
};

ConfirmationDialogBox.propTypes = {
    show: PropTypes.bool,
    env: PropTypes.instanceOf(Environment).isRequired,
    onClose: PropTypes.func,
    onConfirm: PropTypes.func,
};
IssueDialogBox.propTypes = {
    show: PropTypes.bool,
    allowDeletion: PropTypes.bool.isRequired,
    currentUser: PropTypes.object.isRequired,
    story: PropTypes.object.isRequired,
    repos: PropTypes.arrayOf(PropTypes.object),
    issue: PropTypes.object,

    env: PropTypes.instanceOf(Environment).isRequired,

    onConfirm: PropTypes.func,
    onClose: PropTypes.func,
};
MediaDialogBox.propTypes = {
    show: PropTypes.bool,
    resources: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectedIndex: PropTypes.number.isRequired,

    env: PropTypes.instanceOf(Environment).isRequired,

    onClose: PropTypes.func,
};
MembershipRequestDialogBox.propTypes = {
    show: PropTypes.bool,
    currentUser: PropTypes.object,
    project: PropTypes.object,

    env: PropTypes.instanceOf(Environment).isRequired,

    onConfirm: PropTypes.func,
    onRevoke: PropTypes.func,
    onClose: PropTypes.func,
    onProceed: PropTypes.func,
};
MobileSetupDialogBox.propTypes = {
    show: PropTypes.bool,
    system: PropTypes.object,

    database: PropTypes.instanceOf(Database).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,

    onClose: PropTypes.func,
};

ProjectDescriptionDialogBox.propTypes = {
    show: PropTypes.bool,
    project: PropTypes.object.isRequired,

    env: PropTypes.instanceOf(Environment).isRequired,

    onClose: PropTypes.func,
};
ProjectManagementDialogBox.propTypes = {
    show: PropTypes.bool,
    projectLinks: PropTypes.arrayOf(PropTypes.object).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
    onDelete: PropTypes.func,
    onCancel: PropTypes.func,
};

SystemDescriptionDialogBox.propTypes = {
    show: PropTypes.bool,
    system: PropTypes.object,

    env: PropTypes.instanceOf(Environment).isRequired,

    onClose: PropTypes.func,
};
TelephoneNumberDialogBox.propTypes = {
    show: PropTypes.bool,
    number: PropTypes.string,

    env: PropTypes.instanceOf(Environment).isRequired,

    onClose: PropTypes.func,
};
