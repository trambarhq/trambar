import PropTypes from 'prop-types';
import Environment from 'common/env/environment.mjs';

import { ActionBadge } from './action-badge.jsx';
import { ActionConfirmation } from './action-confirmation.jsx';
import { ActivityChart } from './activity-chart.jsx';
import { ComboButton } from './combo-button.jsx';
import { DataLossWarning } from './data-loss-warning.jsx';
import { ImageSelector } from './image-selector.jsx';
import { InputError } from './input-error.jsx';
import { InstructionBlock } from './instruction-block.jsx';

import { ProfileImage } from './profile-image.jsx';

import { TextField } from './text-field.jsx';
import { UnexpectedError } from './unexpected-error.jsx';

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
InputError.propTypes = {
    type: PropTypes.oneOf([ 'error', 'warning' ]),
};
InstructionBlock.propTypes = {
    folder: PropTypes.string.isRequired,
    topic: PropTypes.string.isRequired,
    hidden: PropTypes.bool,
    env: PropTypes.instanceOf(Environment).isRequired,
};

OptionList.propTypes = {
    readOnly: PropTypes.bool,
    onOptionClick: PropTypes.func,
};
ProfileImage.propTypes = {
    user: PropTypes.object,
    size: PropTypes.oneOf([ 'small', 'large' ]),
    env: PropTypes.instanceOf(Environment),
};
SideNavigation.propTypes = {
    disabled: PropTypes.bool,
    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
SignOffMenu.propTypes = {
    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
SortableTable.propTypes = {
    sortColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
    sortDirections: PropTypes.arrayOf(PropTypes.oneOf([ 'asc', 'desc' ])),
    expanded: PropTypes.bool,
    expandable: PropTypes.bool,
    selectable: PropTypes.bool,
    onSort: PropTypes.func,
};
TaskAlertBar.propTypes = {
    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
TaskList.propTypes = {
    scrollToTaskID: PropTypes.number,
    server: PropTypes.object,
    database: PropTypes.instanceOf(Database).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
TextField.propTypes = {
    env: PropTypes.instanceOf(Environment).isRequired,
};
UnexpectedError.propTypes = {
    type: PropTypes.oneOf([ 'error', 'warning' ]),
};
