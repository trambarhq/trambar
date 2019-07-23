import PropTypes from 'prop-types';
import { MarkdownPage, ExcelFile, ExcelSheet } from 'trambar-www';
import { Database } from 'common/data/database.mjs';
import { Route } from 'common/routing/route.mjs';
import { Environment } from 'common/env/environment.mjs';
import { Payloads } from 'common/transport/payloads.mjs';

import { ActionBadge } from './action-badge.jsx';
import { ActionConfirmation } from './action-confirmation.jsx';
import { ActivityChart } from './activity-chart.jsx';
import { ComboButton } from './combo-button.jsx';
import { ExcelPreview } from './excel-preview.jsx';
import { ImageSelector } from './image-selector.jsx';
import { InputError } from './input-error.jsx';
import { InstructionBlock } from './instruction-block.jsx';
import { MarkdownPreview } from './markdown-preview.jsx';
import { MultilingualTextField } from './multilingual-text-field.jsx';
import { NavigationTree } from './navigation-tree.jsx'
import { OptionList } from './option-list.jsx';
import { ProfileImage } from './profile-image.jsx';
import { SideNavigation } from './side-navigation.jsx';
import { SignOffMenu } from './sign-off-menu.jsx';
import { SortableTable } from './sortable-table.jsx';
import { TaskAlertBar } from './task-alert-bar.jsx';
import { TaskList } from './task-list.jsx';
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
ExcelPreview.propTypes = {
    sheet: PropTypes.instanceOf(ExcelSheet),
    localized: PropTypes.instanceOf(ExcelFile),
    env: PropTypes.instanceOf(Environment).isRequired,
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
MarkdownPreview.propTypes = {
    page: PropTypes.instanceOf(MarkdownPage),
    localized: PropTypes.instanceOf(MarkdownPage),
    env: PropTypes.instanceOf(Environment).isRequired,
    onReference: PropTypes.func,
};
MultilingualTextField.propTypes = {
    type: PropTypes.string,
    value: PropTypes.oneOfType([ PropTypes.object, PropTypes.string ]),
    availableLanguageCodes: PropTypes.arrayOf(PropTypes.string),
    env: PropTypes.instanceOf(Environment).isRequired,
    onChange: PropTypes.func,
};
NavigationTree.propTypes = {
    disabled: PropTypes.bool,
    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
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
