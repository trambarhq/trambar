// global accessors
import { Commit } from '../accessors/commit.mjs';
import { Device } from '../accessors/device.mjs';
import { Picture } from '../accessors/picture.mjs';
import { Project } from '../accessors/project.mjs';
import { Repo } from '../accessors/repo.mjs';
import { Role } from '../accessors/role.mjs';
import { Server } from '../accessors/server.mjs';
import { Session } from '../accessors/session.mjs';
import { Snapshot } from '../accessors/snapshot.mjs';
import { Subscription } from '../accessors/subscription.mjs';
import { System } from '../accessors/system.mjs';
import { User } from '../accessors/user.mjs';

// project accessors
import { Bookmark } from '../accessors/bookmark.mjs';
import { Listing } from '../accessors/listing.mjs';
import { Reaction } from '../accessors/reaction.mjs';
import { Rest } from '../accessors/rest.mjs';
import { Spreadsheet } from '../accessors/spreadsheet.mjs';
import { Statistics } from '../accessors/statistics.mjs';
import { Story } from '../accessors/story.mjs';
import { Wiki } from '../accessors/wiki.mjs';

// appear in both
import { Notification } from '../accessors/notification.mjs';
import { Task } from '../accessors/task.mjs';

const globalAccessors = [
  Commit,
  Device,
  Notification,
  Picture,
  Project,
  Repo,
  Role,
  Server,
  Session,
  Snapshot,
  Subscription,
  System,
  Task,
  User,
];
const projectAccessors = [
  Bookmark,
  Listing,
  Notification,
  Reaction,
  Rest,
  Spreadsheet,
  Statistics,
  Story,
  Task,
  Wiki,
];

function getAccessors(schema) {
  return (schema === 'global') ? globalAccessors : projectAccessors;
}

export {
  getAccessors,
};
