import PropTypes from 'prop-types';
import { Database } from 'common/data/database.mjs';
import { Route } from 'common/routing/route.mjs';
import { Environment } from 'common/env/environment.mjs';

import { AuthorNames } from './author-names.jsx';
import { BottomNavigation } from './bottom-navigation.jsx';
import { CalendarBar } from './calendar-bar.jsx';
import { ChartToolbar } from './chart-toolbar.jsx';
import { DevicePlaceholder } from './device-placeholder.jsx';
import { DiagnosticsSection } from './diagnostics-section.jsx';
import { DropZone } from './drop-zone.jsx';
import { DurationIndicator } from './duration-indicator.jsx';
import { EmptyMessage } from './empty-message.jsx';
import { HeaderButton, FileButton } from './header-button.jsx';
import { Link } from './link.jsx';
import { MediaButton, Direction } from './media-button.jsx';
import { MediaPlaceholder } from './media-placeholder.jsx';

AuthorNames.propTypes = {
    authors: PropTypes.arrayOf(PropTypes.object),
    env: PropTypes.instanceOf(Environment).isRequired,
};
BottomNavigation.propTypes = {
    settings: PropTypes.object.isRequired,
    hasAccess: PropTypes.bool,

    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
CalendarBar.propTypes = {
    settings: PropTypes.object.isRequired,
    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
ChartToolbar.propTypes = {
    chartType: PropTypes.oneOf([ 'bar', 'line', 'pie' ]),
    env: PropTypes.instanceOf(Environment).isRequired,
    onAction: PropTypes.func,
};
CoauthoringButton.propTypes = {
    coauthoring: PropTypes.bool,
    story: PropTypes.object.isRequired,
    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,

    onSelect: PropTypes.func,
    onRemove: PropTypes.func,
};
DevicePlaceholder.propTypes = {
    blocked: PropTypes.bool,
    icon: PropTypes.oneOf([ 'camera', 'video-camera', 'microphone' ]).isRequired,
};
DiagnosticsSection.propTypes = {
    label: PropTypes.string,
    hidden: PropTypes.bool,
};
DropZone.propTypes = {
    onDrop: PropTypes.func,
};
DurationIndicator.propTypes = {
    duration: PropTypes.number,
    recording: PropTypes.bool,
};
EmptyMessage.propTypes = {
    phrase: PropTypes.string.isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
HeaderButton.propTypes = {
    label: PropTypes.string,
    icon: PropTypes.string,
    hidden: PropTypes.bool,
    highlighted: PropTypes.bool,
    disabled: PropTypes.bool,
    onClick: PropTypes.func,
};
FileButton.propTypes = {
    label: PropTypes.string,
    icon: PropTypes.string,
    hidden: PropTypes.bool,
    highlighted: PropTypes.bool,
    disabled: PropTypes.bool,
    multiple: PropTypes.bool,
    onChange: PropTypes.func,
};
Link.propTypes = {
    url: PropTypes.string,
    alwaysAsLink: PropTypes.bool,
};
MediaButton.propTypes = {
    label: PropTypes.string,
    icon: PropTypes.string,
    hidden: PropTypes.bool,
    highlighted: PropTypes.bool,
    disabled: PropTypes.bool,
    onChange: PropTypes.func,
};
Direction.propTypes = {
    index: PropTypes.number,
    count: PropTypes.number,
    hidden: PropTypes.bool,
    onBackwardClick: PropTypes.func,
    onForwardClick: PropTypes.func,
};
MediaPlaceholder.propTypes = {
    showHints: PropTypes.bool,
    env: PropTypes.instanceOf(Environment).isRequired,
};
