// global accessors
import Device from '../accessors/device.mjs';
import Picture from '../accessors/picture.mjs';
import Project from '../accessors/project.mjs';
import Repo from '../accessors/repo.mjs';
import Role from '../accessors/role.mjs';
import Server from '../accessors/server.mjs';
import Subscription from '../accessors/subscription.mjs';
import System from '../accessors/system.mjs';
import User from '../accessors/user.mjs';

// project-specific accessors
import Bookmark from '../accessors/bookmark.mjs';
import Listing from '../accessors/listing.mjs';
import Notification from '../accessors/notification.mjs';
import Reaction from '../accessors/reaction.mjs';
import Statistics from '../accessors/statistics.mjs';
import Story from '../accessors/story.mjs';
import Task from '../accessors/task.mjs';
import Wiki from '../accessors/wiki.mjs';

const globalAccessors = [
    Device,
    Picture,
    Project,
    Repo,
    Role,
    Server,
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
    Statistics,
    Story,
    Task,
    Wiki,
];

function get(schema) {
    return (schema === 'global') ? globalAccessors : projectAccessors;
}

export {
    get,
};