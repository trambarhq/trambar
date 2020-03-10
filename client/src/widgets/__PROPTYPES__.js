import PropTypes from 'prop-types';
import { Database } from 'common/data/database.js';
import { Route } from 'common/routing/route.js';
import { Environment } from 'common/env/environment.js';
import { Payloads } from 'common/transport/payloads.js';

import { AuthorNames } from './author-names.jsx';
import { BottomNavigation } from './bottom-navigation.jsx';
import { CalendarBar } from './calendar-bar.jsx';
import { Calendar } from './calendar.jsx';
import { ChartToolbar } from './chart-toolbar.jsx';
import { CoauthoringButton } from './coauthoring-button.jsx';
import { CornerPopUp } from './corner-pop-up.jsx';
import { DevicePlaceholder } from './device-placeholder.jsx';
import { DiagnosticsSection } from './diagnostics-section.jsx';
import { DropZone } from './drop-zone.jsx';
import { DurationIndicator } from './duration-indicator.jsx';
import { EmptyMessage } from './empty-message.jsx';
import { HeaderButton } from './header-button.jsx';
import { Link } from './link.jsx';
import { MediaButton } from './media-button.jsx';
import { MediaPlaceholder } from './media-placeholder.jsx';
import { MediaToolbar } from './media-toolbar.jsx';
import { MultipleUserNames } from './multiple-user-names.jsx';
import { NewItemsAlert } from './new-items-alert.jsx';
import { OptionButton } from './option-button.jsx';
import { PopUpMenu } from './pop-up-menu.jsx';
import { ProfileImage } from './profile-image.jsx';
import { PushButton } from './push-button.jsx';
import { QRCode } from './qr-code.jsx';
import { ReactionMediaToolbar } from './reaction-media-toolbar.jsx';
import { ReactionProgress } from './reaction-progress.jsx';
import { ReactionToolbar } from './reaction-toolbar.jsx';
import { RoleFilterBar } from './role-filter-bar.jsx';
import { RoleFilterButton } from './role-filter-button.jsx';
import { SearchBar } from './search-bar.jsx';
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
Calendar.propTypes = {
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  showYear: PropTypes.bool,
  selection: PropTypes.string,
  env: PropTypes.instanceOf(Environment).isRequired,
  onDateURL: PropTypes.func,
};
ChartToolbar.propTypes = {
  chartType: PropTypes.oneOf([ 'bar', 'line', 'pie' ]),
  env: PropTypes.instanceOf(Environment).isRequired,
  onAction: PropTypes.func,
};
CoauthoringButton.propTypes = {
  authors: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUser: PropTypes.object.isRequired,
  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
  onSelect: PropTypes.func,
  onRemove: PropTypes.func,
};
CornerPopUp.ropType = {
  open: PropTypes.bool,
  disabled: PropTypes.bool,
  name: PropTypes.string,

  onOpen: PropTypes.func,
  onClose: PropTypes.func,
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
  iconClass: PropTypes.string,
  hidden: PropTypes.bool,
  highlighted: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};
HeaderButton.File.propTypes = {
  label: PropTypes.string,
  iconClass: PropTypes.string,
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
  iconClass: PropTypes.string,
  hidden: PropTypes.bool,
  highlighted: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
};
MediaButton.Direction.propTypes = {
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

MediaToolbar.propTypes = {
  story: PropTypes.object.isRequired,
  capturing: PropTypes.oneOf([ 'image', 'video', 'audio' ]),
  env: PropTypes.instanceOf(Environment).isRequired,
  onAction: PropTypes.func,
};
MultipleUserNames.propTypes = {
  label: PropTypes.string,
  title: PropTypes.string,
  users: PropTypes.arrayOf(PropTypes.object).isRequired,
  popupLimit: PropTypes.number,
  env: PropTypes.instanceOf(Environment).isRequired,
};
NewItemsAlert.propTypes = {
  url: PropTypes.string,
  onClick: PropTypes.func,
};
OptionButton.propTypes = {
  label: PropTypes.node,
  id: PropTypes.string,
  iconClass: PropTypes.string,
  iconClassOn: PropTypes.string,
  iconClassOff: PropTypes.string,
  url: PropTypes.string,
  target: PropTypes.string,
  hidden: PropTypes.bool,
  selected: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};
PopUpMenu.propTypes = {
  open: PropTypes.bool,
  disabled: PropTypes.bool,
  name: PropTypes.string,
  popOut: PropTypes.bool,
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
};
ProfileImage.propTypes = {
  user: PropTypes.object,
  size: PropTypes.oneOf([ 'small', 'medium', 'large' ]),
};
PushButton.propTypes = {
  label: PropTypes.string,
  icon: PropTypes.string,
  hidden: PropTypes.bool,
  disabled: PropTypes.bool,
  emphasized: PropTypes.bool,
  onClick: PropTypes.func,
};
PushButton.File.propTypes = {
  label: PropTypes.string,
  icon: PropTypes.string,
  hidden: PropTypes.bool,
  disabled: PropTypes.bool,
  emphasized: PropTypes.bool,
  multiple: PropTypes.bool,
  onChange: PropTypes.func,
};
QRCode.propTypes = {
  text: PropTypes.string,
  scale: PropTypes.number,
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
SearchBar.propTypes = {
  settings: PropTypes.object.isRequired,
  database: PropTypes.instanceOf(Database),
  route: PropTypes.instanceOf(Route),
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
