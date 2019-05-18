import PropTypes from 'prop-types';
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

ProjectDescriptionDialogBox.propTypes = {
    show: PropTypes.bool,
    project: PropTypes.object.isRequired,

    env: PropTypes.instanceOf(Environment).isRequired,

    onClose: PropTypes.func,
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
