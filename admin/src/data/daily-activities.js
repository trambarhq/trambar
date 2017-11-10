var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Memoize = require('utils/memoize');

exports.loadProjectStatistics = loadProjectStatistics;
exports.loadUserStatistics = loadUserStatistics;
exports.loadRepoStatistics = loadRepoStatistics;

function loadProjectStatistics(db, projects) {
    return Promise.map(projects, (project) => {
        if (project.deleted) {
            return null;
        }
        var schema = project.name;
        // load story-date-range statistics
        var criteria = {
            type: 'story-date-range',
            filters: {},
        };
        // don't stall rendering when stats for
        var minimum = 0;
        return db.findOne({ schema, table: 'statistics', criteria, minimum }).then((dateRange) => {
            if (!isValidRange(dateRange)) {
                return;
            }
            var filters = getRangeFilters(dateRange);
            var criteria = { type: 'daily-activities', filters };
            return db.find({ schema, table: 'statistics', criteria, minimum }).then((dailyActivities) => {
                return summarizeStatistics(dailyActivities, dateRange, project);
            });
        });
    }).then((list) => {
        var projectIds = _.map(projects, 'id');
        return _.zipObject(projectIds, list);
    });
}

function loadUserStatistics(db, project, users) {
    if (!project) {
        return Promise.resolve(null);
    }
    var schema = project.name;
    // load story-date-range statistics
    var currentUsers = _.filter(users, (user) => {
        return !user.deleted;
    });
    var criteria = {
        type: 'story-date-range',
        filters: _.map(currentUsers, (user) => {
            return {
                user_ids: [ user.id ]
            };
        }),
    };
    return db.find({ schema, table: 'statistics', criteria }).then((dateRanges) => {
        dateRanges = _.filter(dateRanges, isValidRange);
        // load daily-activities statistics
        var filterLists = _.map(dateRanges, (dateRange) => {
            // attach user id
            return _.map(getRangeFilters(dateRange), (f) => {
                f.user_ids = dateRange.filters.user_ids;
                return f;
            });
        });
        var filters = _.flatten(filterLists);
        if (_.isEmpty(filters)) {
            return {};
        }
        var criteria = { type: 'daily-activities', filters };
        return db.find({ schema, table: 'statistics', criteria }).then((dailyActivitiesAllUsers) => {
            return _.transform(dateRanges, (results, dateRange) => {
                var userId = dateRange.filters.user_ids[0];
                var dailyActivities = _.filter(dailyActivitiesAllUsers, (d) => {
                    return (d.filters.user_ids[0] === userId);
                });
                results[userId] = summarizeStatistics(dailyActivities, dateRange, project);
            }, {});
        });
    });
}

function loadRepoStatistics(db, project, repos) {
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
            // attach repo id
            return _.map(getRangeFilters(dateRange), (f) => {
                f.external_object = dateRange.filters.external_object;
                return f;
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
                results[repo.id] = summarizeStatistics(dailyActivities, dateRange, project);
            }, {});
        });
    });
}

function isValidRange(dateRange) {
    return dateRange && !!dateRange.details.start_time && !!dateRange.details.end_time;
}

function getRangeFilters(dateRange) {
    // get time range of each month (local time)
    var s = Moment(dateRange.details.start_time).startOf('month');
    var e = Moment(dateRange.details.end_time).endOf('month');
    var tzOffset = s.utcOffset();
    var timeRanges = [];
    for (var m = s.clone(); m.month() <= e.month(); m.add(1, 'month')) {
        var rangeStart = m.toISOString();
        var rangeEnd = m.clone().endOf('month').toISOString();
        var range = `[${rangeStart},${rangeEnd}]`;
        timeRanges.push(range);
    }
    return _.map(timeRanges, (timeRange) => {
        return {
            time_range: timeRange,
            tz_offset: tzOffset,
        };
    });
}

var summarizeStatistics = Memoize(function(dailyActivities, dateRange, project) {
    var lastMonth = Moment().subtract(1, 'month').format('YYYY-MM');
    var thisMonth = Moment().format('YYYY-MM');
    var dailyStats = mergeDailyActivities(dailyActivities);
    var summaryLastMonth = summarizeDailyActivities(dailyActivities, lastMonth);
    var summaryThisMonth = summarizeDailyActivities(dailyActivities, thisMonth);
    var summaryToDate = summarizeDailyActivities(dailyActivities);
    if (summaryLastMonth.total === 0) {
        // see if the project was created this month
        var created = Moment(project.ctime).format('YYYY-MM');
        if (created === thisMonth) {
            // field is not applicable
            summaryLastMonth.total = undefined;
        }
    }
    return {
        range: {
            start: dateRange.details.start_time,
            end: dateRange.details.end_time,
        },
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
                stats.total += value;
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
