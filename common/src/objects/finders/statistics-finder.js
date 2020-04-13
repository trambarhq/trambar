import Moment from 'moment';
import { getMonthRanges, getTimeZoneOffset } from '../../utils/date-utils.js';
import { isEqual, isMatch } from '../../utils/object-utils.js';

const table = 'statistics';

/**
 * Fetch statistics, given certain parameters
 *
 * @param  {Database} db
 * @param  {Object} project
 *
 * @return {Object}
 */
async function findStatistics(db, params) {
  let type, user, project, publicOnly = false;
  if (params) {
    type = params.type;
    if (params.user_id) {
      // we know that only the id is used
      user = { id: params.user_id };
    }
    if (db.context.schema) {
      project = { name: db.context.schema };
    }
    publicOnly = params.public;
  }
  if (type === 'daily-activities') {
    if (user && project) {
      return findDailyActivitiesOfUser(db, project, user, publicOnly);
    } else if (project) {
      return findDailyActivitiesOfProject(db, project, user, publicOnly);
    }
  } else if (type === 'daily-notifications') {
    if (user && project) {
      return findDailyNotificationsOfUser(db, project, user);
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('Unrecognized statistics parameters: ', params);
  }
  return null
}

/**
 * Fetch daily activities of one project
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {boolean} publicOnly
 *
 * @return {Object}
 */
async function findDailyActivitiesOfProject(db, project, publicOnly) {
  if (!project || project.deleted) {
    return null;
  }
  // load story-date-range statistics
  const rangeQuery = {
    schema: project.name,
    table,
    criteria: {
      type: 'story-date-range',
      filters: {
        public: publicOnly || undefined,
      },
    },
    prefetch: true,
  };
  const dateRange = await db.findOne(rangeQuery);
  if (!isValidRange(dateRange)) {
    return null;
  }
  const timeRanges = getMonthRanges(dateRange.details.start_time, dateRange.details.end_time);
  const tzOffset = getTimeZoneOffset();
  const filters = timeRanges.map((timeRange) => {
    return {
      time_range: timeRange,
      tz_offset: tzOffset,
      public: publicOnly || undefined,
    };
  });
  const query = {
    schema: project.name,
    table,
    criteria: {
      type: 'daily-activities',
      filters
    },
    prefetch: true,
  };
  const dailyActivities = await db.find(query);
  return summarizeStatistics(dailyActivities, dateRange);
}

/**
 * Fetch daily activities of multiple projects, with results keyed by project id
 *
 * @param  {Database} db
 * @param  {Project[]} projects
 *
 * @return {Object}
 */
async function findDailyActivitiesOfProjects(db, projects) {
  const results = {};
  for (let project of projects) {
    results[project.id] = await findDailyActivitiesOfProject(db, project);
  }
  return results;
}

/**
 * Fetch daily activities of one user in a given project
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {boolean} publicOnly
 *
 * @return {Object}
 */
async function findDailyActivitiesOfUser(db, project, user, publicOnly) {
  if (!user || user.deleted) {
    return null;
  }
  const results = await findDailyActivitiesOfUsers(db, project, [ user ], publicOnly);
  return results[user.id] || null;
}

/**
 * Fetch daily activities of multiple users, with results keyed by user id
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {User[]} users
 * @param  {boolean} publicOnly
 *
 * @return {Object}
 */
async function findDailyActivitiesOfUsers(db, project, users, publicOnly) {
  if (!project || project.deleted) {
    return null;
  }
  const schema = project.name;
  // load story-date-range statistics
  const rangeFilters = [];
  for (let user of users) {
    if (!user.deleted) {
      rangeFilters.push({
        user_ids: [ user.id ],
        public: publicOnly || undefined,
      });
    }
  }
  const rangeQuery = {
    schema: project.name,
    table,
    criteria: { type: 'story-date-range', filters: rangeFilters },
    prefetch: true,
  };
  const dateRanges = await db.find(rangeQuery);

  // load daily-activities statistics
  const filters = [];
  for (let dateRange of dateRanges) {
    if (isValidRange(dateRange)) {
      const startTime = dateRange.details.start_time;
      const endTime = dateRange.details.end_time;
      const timeRanges = getMonthRanges(startTime, endTime);
      const tzOffset = getTimeZoneOffset();
      for (let timeRange of timeRanges) {
        filters.push({
          user_ids: dateRange.filters.user_ids,
          time_range: timeRange,
          tz_offset: tzOffset,
          public: publicOnly || undefined,
        });
      }
    }
  }
  if (filters.length === 0) {
    return {};
  }
  const query = {
    schema: project.name,
    table,
    criteria: { type: 'daily-activities', filters },
    prefetch: true,
  };
  const dailyActivitiesAllUsers = await db.find(query);
  const results = {};
  for (let dateRange of dateRanges) {
    if (isValidRange(dateRange)) {
      const userID = dateRange.filters.user_ids[0];
      const dailyActivities = dailyActivitiesAllUsers.filter((d) => {
        return (d.filters.user_ids[0] === userID);
      });
      results[userID] = summarizeStatistics(dailyActivities, dateRange);
    }
  }
  return results;
}

/**
 * Fetch notification stats of one user in a given project
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {User} user
 *
 * @return {Object}
 */
async function findDailyNotificationsOfUser(db, project, user) {
  if (!user || user.deleted) {
    return null;
  }
  let results = await findDailyNotificationsOfUsers(db, project, [ user ]);
  return results[user.id] || null;
}

/**
 * Fetch notification stats of multiple users, with results keyed by user id
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {User[]} users
 *
 * @return {Object}
 */
async function findDailyNotificationsOfUsers(db, project, users) {
  if (!project || project.deleted) {
    return null;
  }
  const schema = project.name;
  // load notification-date-range statistics
  const rangeFilters = [];
  for (let user of users) {
    if (!user.deleted) {
      rangeFilters.push({ target_user_id: user.id });
    }
  }
  const rangeQuery = {
    schema,
    table,
    criteria: { type: 'notification-date-range', filters: rangeFilters }
  };
  const dateRanges = await db.find(rangeQuery);

  // load daily-activities statistics
  const filters = [];
  for (let dateRange of dateRanges) {
    if (isValidRange(dateRange)) {
      const startTime = dateRange.details.start_time;
      const endTime = dateRange.details.end_time;
      const timeRanges = getMonthRanges(startTime, endtime);
      const tzOffset = getTimeZoneOffset();
      for (let timeRange of timeRanges) {
        filters.push({
          target_user_id: dateRange.filters.target_user_id,
          time_range: timeRange,
          tz_offset: tzOffset,
        });
      }
    }
  }
  if (filters.length === 0) {
    return {};
  }
  const query = {
    schema,
    table,
    criteria: { type: 'daily-notifications', filters },
  };
  const dailyNotificationsAllUsers = await db.find(query);
  const results = {};
  for (let dateRange of dateRanges) {
    if (isValidRange(dateRange)) {
      const userID = dateRange.filters.target_user_id;
      const dailyNotifications = dailyNotificationsAllUsers.filter((d) => {
        return (d.filters.target_user_id === userID);
      });
      results[userID] = summarizeStatistics(dailyNotifications, dateRange);
    }
  }
  return results;
}

/**
 * Fetch daily activities of one repo
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {Repo} repo
 *
 * @return {Object}
 */
async function findDailyActivitiesOfRepo(db, project, repo) {
  if (!project || project.deleted || !repo || repo.deleted) {
    return null;
  }
  let results = await findDailyActivitiesOfRepos(db, project, [ repo ]);
  return results[repo.id] || null;
}

/**
 * Fetch daily activities of multiple repos, with results keyed by repo id
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {Repo[]} repos
 *
 * @return {Object}
 */
async function findDailyActivitiesOfRepos(db, project, repos) {
  if (!project || project.deleted) {
    return null;
  }
  const schema = project.name;
  // load story-date-range statistics
  const rangeFilters = [];
  for (let repo of repos) {
    if (!repo.deleted) {
      const link = repo.external.find(lnk => lnk.type === repo.type);
      rangeFilters.push({ external_object: link });
    }
  }
  const rangeQuery = {
    schema,
    table,
    criteria: { type: 'story-date-range', filters: rangeFilters },
  };
  const dateRanges = await db.find(rangeQuery);

  // load daily-activities statistics
  const filters = [];
  for (let dateRange of dateRanges) {
    if (isValidRange(dateRange)) {
      const startTime = dateRange.details.start_time;
      const endTime = dateRange.details.end_time;
      const timeRanges = getMonthRanges(startTime, endTime);
      const tzOffset = getTimeZoneOffset();
      for (let timeRange of timeRanges) {
        filters.push({
          external_object: dateRange.filters.external_object,
          time_range: timeRange,
          tz_offset: tzOffset,
        });
      }
    }
  }
  if (filters.length === 0) {
    return {};
  }
  const query = {
    schema,
    table,
    criteria: { type: 'daily-activities', filters },
  };
  const dailyActivitiesAllRepos = await db.find(query);
  const results = {};
  for (let dateRange of dateRanges) {
    if (isValidRange(dateRange)) {
      // find stats associated with data range object
      const link = dateRange.filters.external_object;
      const dailyActivities = dailyActivitiesAllRepos.filter((d) => {
        return isEqual(d.filters.external_object, link);
      });
      // find repo with external id
      const repo = repos.find((repo) => {
        return repo.external.some(l => isMatch(l, link));
      });
      results[repo.id] = summarizeStatistics(dailyActivities, dateRange);
    }
  }
  return results;
}

function isValidRange(dateRange) {
  return dateRange && !!dateRange.details.start_time && !!dateRange.details.end_time;
}

function summarizeStatistics(dailyActivities, dateRange, project) {
  const lastMonth = Moment().subtract(1, 'month').format('YYYY-MM');
  const thisMonth = Moment().format('YYYY-MM');
  const dailyStats = mergeDailyActivities(dailyActivities);
  const summaryLastMonth = summarizeDailyActivities(dailyActivities, lastMonth);
  const summaryThisMonth = summarizeDailyActivities(dailyActivities, thisMonth);
  const summaryToDate = summarizeDailyActivities(dailyActivities);
  const start = dateRange.details.start_time;
  const end = dateRange.details.end_time;
  if (summaryLastMonth.total === 0) {
    const startMonth = start.substr(0, 7);
    if (!(startMonth <= lastMonth)) {
      // field is not applicable
      summaryLastMonth.total = undefined;
    }
  }
  return {
    range: { start, end },
    last_month: summaryLastMonth,
    this_month: summaryThisMonth,
    to_date: summaryToDate,
    daily: dailyStats,
  }
}

function summarizeDailyActivities(dailyActivities, month) {
  const stats = { total: 0 };
  for (let monthlyStats of dailyActivities) {
    const dateRange = monthlyStats.filters.time_range;
    const dates = dateRange.slice(1, -1).split(',');
    const startMonth = Moment(dates[0]).format('YYYY-MM');
    const endMonth = Moment(dates[1]).format('YYYY-MM');
    if (!month || (startMonth <= month && month <= endMonth)) {
      for (let [ date, dailyCounts ] of Object.entries(monthlyStats.details)) {
        for (let [ type, value ] of Object.entries(dailyCounts)) {
          if (type.charAt(0) !== '#') {
            stats.total += value;
          }
          if (stats[type]) {
            stats[type] += value;
          } else {
            stats[type] = value;
          }
        }
      }
      if (monthlyStats.dirty) {
        stats.dirty = true;
      }
    }
  }
  return stats;
}

function mergeDailyActivities(dailyActivities) {
  const stats = {};
  for (let monthlyStats of dailyActivities) {
    Object.assign(stats, monthlyStats.details);
  }
  return stats;
}

export {
  findStatistics,
  findDailyActivitiesOfProject,
  findDailyActivitiesOfProjects,
  findDailyActivitiesOfUser,
  findDailyActivitiesOfUsers,
  findDailyNotificationsOfUser,
  findDailyNotificationsOfUsers,
  findDailyActivitiesOfRepo,
  findDailyActivitiesOfRepos,
};
