import PropTypes from 'prop-types';
import Environment from 'common/env/environment.mjs';

import { ActionBadge } from './action-badge.jsx';
import { ActionConfirmation } from './action-confirmation.jsx';
import { ActivityChart } from './activity-chart.jsx';
import { ComboButton } from './combo-button.jsx';
import { DataLossWarning } from './data-loss-warning.jsx';

ActionBadge.propTypes = {
    type: PropTypes.string.isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
ActionConfirmation.propTypes = {
    env: PropTypes.instanceOf(Environment).isRequired,
};
ActivityChart.propTypes = {
    statistics: PropTypes.object,
    env: PropTypes.instanceOf(Environment),
};
ComboButton.propType = {
    preselected: PropTypes.string,
    alert: PropTypes.bool,
};
DataLossWarning.propTypes = {
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
    changes: PropTypes.bool,
};
ImageSelector.propTypes = {
    purpose: PropTypes.string,
    desiredWidth: PropTypes.number,
    desiredHeight: PropTypes.number,
    resources: PropTypes.arrayOf(PropTypes.object),
    readOnly: PropTypes.bool,
    database: PropTypes.instanceOf(Database).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    onChange: PropTypes.func,
};
