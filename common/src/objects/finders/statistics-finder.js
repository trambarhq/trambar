import _ from 'lodash';
import Moment from 'moment';
import { memoizeWeak } from '../../utils/memoize.js';
import * as DateUtils from '../../utils/date-utils.js';

const table = 'statistics';

/**
 * Fetch statistics, given certain parameters
 *
 * @param  {Database} db
 * @param  {Object} project
 *
 * @return {Promise<Object>}
 */
async function find(db, params) {
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
 * @param  {Boolean} publicOnly
 *
 * @return {Promise<Object>}
 */
async function findDailyActivitiesOfProject(db, project, publicOnly) {
  if (!project || project.deleted) {
    return null;
  }
  // load story-date-range statistics
  let rangeQuery = {
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
  let dateRange = await db.findOne(rangeQuery);
  if (!isValidRange(dateRange)) {
    return null;
  }
  let timeRanges = DateUtils.getMonthRanges(dateRange.details.start_time, dateRange.details.end_time);
  let tzOffset = DateUtils.getTimeZoneOffset();
  let filters = _.map(timeRanges, (timeRange) => {
    return {
      time_range: timeRange,
      tz_offset: tzOffset,
      public: publicOnly || undefined,
    };
  });
  let query = {
    schema: project.name,
    table,
    criteria: {
      type: 'daily-activities',
      filters
    },
    prefetch: true,
  };
  let dailyActivities = await db.find(query);
  return summarizeStatistics(dailyActivities, dateRange);
}

/**
 * Fetch daily activities of multiple projects, with results keyed by project id
 *
 * @param  {Database} db
 * @param  {Array<Project>} projects
 *
 * @return {Promise<Object>}
 */
async function findDailyActivitiesOfProjects(db, projects) {
  let results = {};
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
 * @param  {Boolean} publicOnly
 *
 * @return {Promise<Object>}
 */
async function findDailyActivitiesOfUser(db, project, user, publicOnly) {
  if (!user || user.deleted) {
    return null;
  }
  let results = await findDailyActivitiesOfUsers(db, project, [ user ], publicOnly);
  return _.get(results, user.id, null);
}

/**
 * Fetch daily activities of multiple users, with results keyed by user id
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {Array<User>} users
 * @param  {Boolean} publicOnly
 *
 * @return {Promise<Object>}
 */
async function findDailyActivitiesOfUsers(db, project, users, publicOnly) {
  if (!project || project.deleted) {
    return null;
  }
  let schema = project.name;
  // load story-date-range statistics
  let currentUsers = _.filter(users, (user) => {
    return !user.deleted;
  });
  let rangeFilters = _.map(currentUsers, (user) => {
    return {
      user_ids: [ user.id ],
      public: publicOnly || undefined,
    };
  });
  let rangeQuery = {
    schema: project.name,
    table,
    criteria: { type: 'story-date-range', filters: rangeFilters },
    prefetch: true,
  };
  let dateRanges = await db.find(rangeQuery);
  dateRanges = _.filter(dateRanges, isValidRange);
  // load daily-activities statistics
  let filterLists = _.map(dateRanges, (dateRange) => {
    let timeRanges = DateUtils.getMonthRanges(dateRange.details.start_time, dateRange.details.end_time);
    let tzOffset = DateUtils.getTimeZoneOffset();
    return _.map(timeRanges, (timeRange) => {
      return {
        user_ids: dateRange.filters.user_ids,
        time_range: timeRange,
        tz_offset: tzOffset,
        public: publicOnly || undefined,
      };
    });
  });
  let filters = _.flatten(filterLists);
  if (_.isEmpty(filters)) {
    return {};
  }
  let query = {
    schema: project.name,
    table,
    criteria: { type: 'daily-activities', filters },
    prefetch: true,
  };
  let dailyActivitiesAllUsers = await db.find(query);
  let results = {};
  for (let dateRange of dateRanges) {
    let userID = dateRange.filters.user_ids[0];
    let dailyActivities = _.filter(dailyActivitiesAllUsers, (d) => {
      return (d.filters.user_ids[0] === userID);
    });
    results[userID] = summarizeStatistics(dailyActivities, dateRange);
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
 * @return {Promise<Object>}
 */
async function findDailyNotificationsOfUser(db, project, user) {
  if (!user || user.deleted) {
    return null;
  }
  let results = await findDailyNotificationsOfUsers(db, project, [ user ]);
  return _.get(results, user.id, null);
}

/**
 * Fetch notification stats of multiple users, with results keyed by user id
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {Array<User>} users
 *
 * @return {Promise<Object>}
 */
async function findDailyNotificationsOfUsers(db, project, users) {
  if (!project || project.deleted) {
    return null;
  }
  let schema = project.name;
  // load notification-date-range statistics
  let currentUsers = _.filter(users, (user) => {
    return !user.deleted;
  });
  let rangeFilters = _.map(currentUsers, (user) => {
    return { target_user_id: user.id };
  });
  let rangeQuery = {
    schema,
    table,
    criteria: { type: 'notification-date-range', filters: rangeFilters }
  };
  let dateRanges = await db.find(rangeQuery);
  dateRanges = _.filter(dateRanges, isValidRange);
  // load daily-activities statistics
  let filterLists = _.map(dateRanges, (dateRange) => {
    let timeRanges = DateUtils.getMonthRanges(dateRange.details.start_time, dateRange.details.end_time);
    let tzOffset = DateUtils.getTimeZoneOffset();
    return _.map(timeRanges, (timeRange) => {
      return {
        target_user_id: dateRange.filters.target_user_id,
        time_range: timeRange,
        tz_offset: tzOffset,
      };
    });
  });
  let filters = _.flatten(filterLists);
  if (_.isEmpty(filters)) {
    return {};
  }
  let query = {
    schema,
    table,
    criteria: { type: 'daily-notifications', filters },
  };
  let dailyNotificationsAllUsers = await db.find(query);
  let results = {};
  for (let dateRange of dateRanges) {
    let userID = dateRange.filters.target_user_id;
    let dailyNotifications = _.filter(dailyNotificationsAllUsers, (d) => {
      return (d.filters.target_user_id === userID);
    });
    results[userID] = summarizeStatistics(dailyNotifications, dateRange);
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
 * @return {Promise<Object>}
 */
async function findDailyActivitiesOfRepo(db, project, repo) {
  if (!project || project.deleted || !repo || repo.deleted) {
    return null;
  }
  let results = await findDailyActivitiesOfRepos(db, project, [ repo ]);
  return _.get(results, repo.id, null);
}

/**
 * Fetch daily activities of multiple repos, with results keyed by repo id
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {Array<Repo>} repos
 *
 * @return {Promise<Object>}
 */
async function findDailyActivitiesOfRepos(db, project, repos) {
  if (!project || project.deleted) {
    return null;
  }
  let schema = project.name;
  // load story-date-range statistics
  let currentRepos = _.filter(repos, (repo) => {
    return !repo.deleted;
  });
  let rangeFilters = _.map(currentRepos, (repo) => {
    let link = _.find(repo.external, { type: repo.type });
    return { external_object: link };
  });
  let rangeQuery = {
    schema,
    table,
    criteria: { type: 'story-date-range', filters: rangeFilters },
  };
  let dateRanges = await db.find(rangeQuery);
  dateRanges = _.filter(dateRanges, isValidRange);
  // load daily-activities statistics
  let filterLists = _.map(dateRanges, (dateRange) => {
    let timeRanges = DateUtils.getMonthRanges(dateRange.details.start_time, dateRange.details.end_time);
    let tzOffset = DateUtils.getTimeZoneOffset();
    return _.map(timeRanges, (timeRange) => {
      return {
        external_object: dateRange.filters.external_object,
        time_range: timeRange,
        tz_offset: tzOffset,
      };
    });
  });
  let filters = _.flatten(filterLists);
  if (_.isEmpty(filters)) {
    return {};
  }
  let query = {
    schema,
    table,
    criteria: { type: 'daily-activities', filters },
  };
  let dailyActivitiesAllRepos = await db.find(query);
  let results = {};
  for (let dateRange of dateRanges) {
    // find stats associated with data range object
    let link = dateRange.filters.external_object;
    let dailyActivities = _.filter(dailyActivitiesAllRepos, (d) => {
      return _.isEqual(d.filters.external_object, link);
    });
    // find repo with external id
    let repo = _.find(repos, (repo) => {
      return _.some(repo.external, link);
    });
    results[repo.id] = summarizeStatistics(dailyActivities, dateRange);
  }
  return results;
}

function isValidRange(dateRange) {
  return dateRange && !!dateRange.details.start_time && !!dateRange.details.end_time;
}

let summarizeStatistics = memoizeWeak(null, function(dailyActivities, dateRange, project) {
  let lastMonth = Moment().subtract(1, 'month').format('YYYY-MM');
  let thisMonth = Moment().format('YYYY-MM');
  let dailyStats = mergeDailyActivities(dailyActivities);
  let summaryLastMonth = summarizeDailyActivities(dailyActivities, lastMonth);
  let summaryThisMonth = summarizeDailyActivities(dailyActivities, thisMonth);
  let summaryToDate = summarizeDailyActivities(dailyActivities);
  let start = dateRange.details.start_time;
  let end = dateRange.details.end_time;
  if (summaryLastMonth.total === 0) {
    let startMonth = start.substr(0, 7);
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
});

function summarizeDailyActivities(dailyActivities, month) {
  let stats = { total: 0 };
  for (let monthlyStats of dailyActivities) {
    let dateRange = monthlyStats.filters.time_range;
    let dates = _.split(dateRange.slice(1, -1), ',');
    let startMonth = Moment(dates[0]).format('YYYY-MM');
    let endMonth = Moment(dates[1]).format('YYYY-MM');
    if (!month || (startMonth <= month && month <= endMonth)) {
      for (let [ date, dailyCounts ] of _.entries(monthlyStats.details)) {
        for (let [ type, value ] of _.entries(dailyCounts)) {
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
  let stats = {};
  for (let monthlyStats of dailyActivities) {
    _.assign(stats, monthlyStats.details);
  }
  return stats;
}

export {
  find,
  findDailyActivitiesOfProject,
  findDailyActivitiesOfProjects,
  findDailyActivitiesOfUser,
  findDailyActivitiesOfUsers,
  findDailyNotificationsOfUser,
  findDailyNotificationsOfUsers,
  findDailyActivitiesOfRepo,
  findDailyActivitiesOfRepos,
};
