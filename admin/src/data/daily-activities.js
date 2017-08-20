var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Memoize = require('utils/memoize');

exports.loadProjectStatistics = loadProjectStatistics;
exports.loadUserStatistics = loadUserStatistics;

function loadProjectStatistics(db, projects) {
    return Promise.map(projects, (project) => {
        var schema = project.name;
        // load story-date-range statistics
        var criteria = {
            type: 'story-date-range',
            filters: {},
        };
        return db.findOne({ schema, table: 'statistics', criteria }).then((dateRange) => {
            if (!isValidRange(dateRange)) {
                return;
            }
            var filters = getRangeFilters(dateRange);
            var criteria = { type: 'daily-activities', filters };
            return db.find({ schema, table: 'statistics', criteria }).then((dailyActivities) => {
                return summarizeStatistics(dailyActivities, dateRange, project);
            });
        });
    }).then((list) => {
        var projectIds = _.map(projects, 'id');
        return _.zipObject(projectIds, list);
    });
}

function loadUserStatistics(db, project, users) {
    var schema = project.name;
    // load story-date-range statistics
    var criteria = {
        type: 'story-date-range',
        filters: _.map(users, (user) => {
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
