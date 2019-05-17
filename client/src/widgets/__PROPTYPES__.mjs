import PropTypes from 'prop-types';
import { Database } from 'common/data/database.mjs';
import { Route } from 'common/routing/route.mjs';
import { Environment } from 'common/env/environment.mjs';
import { Payloads } from 'common/transport/payloads.mjs';

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

import { ReactionMediaToolbar } from './reaction-media-toolbar.jsx';
import { ReactionProgress } from './reaction-progress.jsx';
import { ReactionToolbar } from './reaction-toolbar.jsx';
import { RoleFilterBar } from './role-filter-bar.jsx';
import { RoleFilterButton } from './role-filter-button.jsx';
import { StoryEmblem } from './story-emblem.jsx';
import { StoryProgress } from './story-progress.jsx';
import { TextField } from './text-field.jsx';
import { TextToolbar } from './text-toolbar.jsx';
import { Time } from './time.jsx';
import { TopNavigation } from './top-navigation.jsx';
import { VolumeIndicator } from './volume-indicator.jsx';

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

ReactionMediaToolbar.propTypes = {
    reaction: PropTypes.object.isRequired,
    capturing: PropTypes.oneOf([ 'image', 'video', 'audio' ]),
    env: PropTypes.instanceOf(Environment).isRequired,
    onAction: PropTypes.func,
};
ReactionProgress.propTypes = {
    status: PropTypes.object,
    reaction: PropTypes.object.isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
ReactionToolbar.propTypes = {
    access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]),
    currentUser: PropTypes.object,
    reactions: PropTypes.arrayOf(PropTypes.object),
    respondents: PropTypes.arrayOf(PropTypes.object),
    addingComment: PropTypes.bool,
    disabled: PropTypes.bool,
    env: PropTypes.instanceOf(Environment).isRequired,
    onAction: PropTypes.func,
}
RoleFilterBar.propTypes = {
    settings: PropTypes.object.isRequired,

    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
RoleFilterButton.propTypes = {
    role: PropTypes.object,
    users: PropTypes.arrayOf(PropTypes.object),
    selected: PropTypes.bool,
    url: PropTypes.string,

    env: PropTypes.instanceOf(Environment).isRequired,
};
StoryEmblem.propTypes = {
    story: PropTypes.object.isRequired,
};
StoryProgress.propTypes = {
    status: PropTypes.object,
    story: PropTypes.object.isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
TextField.propTypes = {
    env: PropTypes.instanceOf(Environment).isRequired,
};
TextToolbar.propTypes = {
    story: PropTypes.object.isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
    onAction: PropTypes.func,
};
Time.propTypes = {
    time: PropTypes.string,
    compact: PropTypes.bool,
    env: PropTypes.instanceOf(Environment).isRequired,
};
TopNavigation.propTypes = {
    settings: PropTypes.object.isRequired,

    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
VolumeIndicator.propTypes = {
    type: PropTypes.oneOf([ 'bar', 'gauge' ]),
    volume: PropTypes.number,
    recording: PropTypes.bool,
};
