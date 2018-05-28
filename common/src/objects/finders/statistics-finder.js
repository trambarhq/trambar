var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Memoize = require('utils/memoize');
var DateUtils = require('utils/date-utils');

module.exports = {
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

/**
 * Fetch statistics, given certain parameters
 *
 * @param  {Database} db
 * @param  {Object} project
 *
 * @return {Promise<Object>}
 */
function find(db, params) {
    var type, user, project, publicOnly = false;
    if (params) {
        type = params.type;
        if (params.user) {
            user = params.user;
        } else if (params.user_id) {
            // we know that only the id is used
            user = { id: params.user_id };
        }
        if (params.project) {
            project = params.project;
        } else if (params.schema) {
            project = { name: params.schema };
        } else if (params.project_name) {
            project = { name: params.project_name };
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
    return Promise.resolve(null)
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
function findDailyActivitiesOfProject(db, project, publicOnly) {
    if (!project || project.deleted) {
        return null;
    }
    // load story-date-range statistics
    var query = {
        schema: project.name,
        table: 'statistics',
        criteria: {
            type: 'story-date-range',
            filters: {
                public: publicOnly || undefined,
            },
        },
        prefetch: true,
    };
    return db.findOne(query).then((dateRange) => {
        if (!isValidRange(dateRange)) {
            return;
        }
        var timeRanges = DateUtils.getMonthRanges(dateRange.details.start_time, dateRange.details.end_time);
        var tzOffset = DateUtils.getTimeZoneOffset();
        var filters = _.map(timeRanges, (timeRange) => {
            return {
                time_range: timeRange,
                tz_offset: tzOffset,
                public: publicOnly || undefined,
            };
        });
        var query = {
            schema: project.name,
            table: 'statistics',
            criteria: {
                type: 'daily-activities',
                filters
            },
            prefetch: true,
        };
        return db.find(query).then((dailyActivities) => {
            return summarizeStatistics(dailyActivities, dateRange);
        });
    });
}

/**
 * Fetch daily activities of multiple projects, with results keyed by project id
 *
 * @param  {Database} db
 * @param  {Array<Project>} projects
 *
 * @return {Promise<Object>}
 */
function findDailyActivitiesOfProjects(db, projects) {
    return Promise.mapSeries(projects, (project) => {
        return findDailyActivitiesOfProject(db, project);
    }).then((list) => {
        var projectIds = _.map(projects, 'id');
        return _.zipObject(projectIds, list);
    });
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
function findDailyActivitiesOfUser(db, project, user, publicOnly) {
    if (!user) {
        return null;
    }
    return findDailyActivitiesOfUsers(db, project, [ user ], publicOnly).then((hash) => {
        return _.get(hash, user.id, null);
    });
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
function findDailyActivitiesOfUsers(db, project, users, publicOnly) {
    if (!project) {
        return Promise.resolve(null);
    }
    var schema = project.name;
    // load story-date-range statistics
    var currentUsers = _.filter(users, (user) => {
        return !user.deleted;
    });
    var filters = _.map(currentUsers, (user) => {
        return {
            user_ids: [ user.id ],
            public: publicOnly || undefined,
        };
    });
    var query = {
        schema: project.name,
        table: 'statistics',
        criteria: { type: 'story-date-range', filters },
        prefetch: true,
    };
    return db.find(query).then((dateRanges) => {
        dateRanges = _.filter(dateRanges, isValidRange);
        // load daily-activities statistics
        var filterLists = _.map(dateRanges, (dateRange) => {
            var timeRanges = DateUtils.getMonthRanges(dateRange.details.start_time, dateRange.details.end_time);
            var tzOffset = DateUtils.getTimeZoneOffset();
            return _.map(timeRanges, (timeRange) => {
                return {
                    user_ids: dateRange.filters.user_ids,
                    time_range: timeRange,
                    tz_offset: tzOffset,
                    public: publicOnly || undefined,
                };
            });
        });
        var filters = _.flatten(filterLists);
        if (_.isEmpty(filters)) {
            return {};
        }
        var query = {
            schema: project.name,
            table: 'statistics',
            criteria: { type: 'daily-activities', filters },
            prefetch: true,
        };
        return db.find(query).then((dailyActivitiesAllUsers) => {
            return _.transform(dateRanges, (results, dateRange) => {
                var userId = dateRange.filters.user_ids[0];
                var dailyActivities = _.filter(dailyActivitiesAllUsers, (d) => {
                    return (d.filters.user_ids[0] === userId);
                });
                results[userId] = summarizeStatistics(dailyActivities, dateRange);
            }, {});
        });
    });
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
function findDailyNotificationsOfUser(db, project, user) {
    if (!user) {
        return null;
    }
    return findDailyNotificationsOfUsers(db, project, [ user ]).then((hash) => {
        return _.get(hash, user.id, null);
    });
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
function findDailyNotificationsOfUsers(db, project, users) {
    if (!project) {
        return Promise.resolve(null);
    }
    var schema = project.name;
    // load notification-date-range statistics
    var currentUsers = _.filter(users, (user) => {
        return !user.deleted;
    });
    var criteria = {
        type: 'notification-date-range',
        filters: _.map(currentUsers, (user) => {
            return {
                target_user_id: user.id
            };
        }),
    };
    return db.find({ schema, table: 'statistics', criteria }).then((dateRanges) => {
        dateRanges = _.filter(dateRanges, isValidRange);
        // load daily-activities statistics
        var filterLists = _.map(dateRanges, (dateRange) => {
            var timeRanges = DateUtils.getMonthRanges(dateRange.details.start_time, dateRange.details.end_time);
            var tzOffset = DateUtils.getTimeZoneOffset();
            return _.map(timeRanges, (timeRange) => {
                return {
                    target_user_id: dateRange.filters.target_user_id,
                    time_range: timeRange,
                    tz_offset: tzOffset,
                };
            });
        });
        var filters = _.flatten(filterLists);
        if (_.isEmpty(filters)) {
            return {};
        }
        var criteria = { type: 'daily-notifications', filters };
        return db.find({ schema, table: 'statistics', criteria }).then((dailyNotificationsAllUsers) => {
            return _.transform(dateRanges, (results, dateRange) => {
                var userId = dateRange.filters.target_user_id;
                var dailyNotifications = _.filter(dailyNotificationsAllUsers, (d) => {
                    return (d.filters.target_user_id === userId);
                });
                results[userId] = summarizeStatistics(dailyNotifications, dateRange);
            }, {});
        });
    });
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
function findDailyActivitiesOfRepo(db, project, repo) {
    if (!repo) {
        return null;
    }
    return findDailyActivitiesOfRepos(db, project, [ repo ]).then((hash) => {
        return _.get(hash, repo.id, null);
    });
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
function findDailyActivitiesOfRepos(db, project, repos) {
    if (!project) {
        return Promise.resolve(null);
    }
    var schema = project.name;
    // load story-date-range statistics
    var currentRepos = _.filter(repos, (repo) => {
        return !repo.deleted;
    });
    var criteria = {
        type: 'story-date-range',
        filters: _.map(currentRepos, (repo) => {
            var link = _.find(repo.external, { type: repo.type });
            return {
                external_object: link
            };
        }),
    };
    return db.find({ schema, table: 'statistics', criteria }).then((dateRanges) => {
        dateRanges = _.filter(dateRanges, isValidRange);
        // load daily-activities statistics
        var filterLists = _.map(dateRanges, (dateRange) => {
            var timeRanges = DateUtils.getMonthRanges(dateRange.details.start_time, dateRange.details.end_time);
            var tzOffset = DateUtils.getTimeZoneOffset();
            return _.map(timeRanges, (timeRange) => {
                return {
                    external_object: dateRange.filters.external_object,
                    time_range: timeRange,
                    tz_offset: tzOffset,
                };
            });
        });
        var filters = _.flatten(filterLists);
        if (_.isEmpty(filters)) {
            return {};
        }
        var criteria = { type: 'daily-activities', filters };
        return db.find({ schema, table: 'statistics', criteria }).then((dailyActivitiesAllRepos) => {
            return _.transform(dateRanges, (results, dateRange) => {
                // find stats associated with data range object
                var link = dateRange.filters.external_object;
                var dailyActivities = _.filter(dailyActivitiesAllRepos, (d) => {
                    return _.isEqual(d.filters.external_object, link);
                });
                // find repo with external id
                var repo = _.find(repos, (repo) => {
                    return _.some(repo.external, link);
                });
                results[repo.id] = summarizeStatistics(dailyActivities, dateRange);
            }, {});
        });
    });
}

function isValidRange(dateRange) {
    return dateRange && !!dateRange.details.start_time && !!dateRange.details.end_time;
}

var summarizeStatistics = Memoize(function(dailyActivities, dateRange, project) {
    var lastMonth = Moment().subtract(1, 'month').format('YYYY-MM');
    var thisMonth = Moment().format('YYYY-MM');
    var dailyStats = mergeDailyActivities(dailyActivities);
    var summaryLastMonth = summarizeDailyActivities(dailyActivities, lastMonth);
    var summaryThisMonth = summarizeDailyActivities(dailyActivities, thisMonth);
    var summaryToDate = summarizeDailyActivities(dailyActivities);
    var start = dateRange.details.start_time;
    var end = dateRange.details.end_time;
    if (summaryLastMonth.total === 0) {
        var startMonth = start.substr(0, 7);
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
    var stats = { total: 0 };
    _.each(dailyActivities, (monthlyStats) => {
        _.each(monthlyStats.details, (dailyCounts, date) => {
            if (month && date.substr(0, 7) !== month) {
                return;
            }
            _.each(dailyCounts, (value, type) => {
                if (type.charAt(0) !== '#') {
                    stats.total += value;
                }
                if (stats[type]) {
                    stats[type] += value;
                } else {
                    stats[type] = value;
                }
            });
        });
    });
    return stats;
}

function mergeDailyActivities(dailyActivities) {
    var stats = {};
    _.each(dailyActivities, (monthlyStats) => {
        _.assign(stats, monthlyStats.details);
    });
    return stats;
}
