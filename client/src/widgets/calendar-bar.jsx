var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');

var NewsPage = require('pages/news-page');
var NotificationsPage = require('pages/notifications-page');
var UserActivityPage = require('pages/user-activity-page');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Calendar = require('widgets/calendar');

require('./calendar-bar.scss');

module.exports = Relaks.createClass({
    displayName: 'CalendarBar',
    propTypes: {
        selection: PropTypes.string,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,

        onSelect: PropTypes.func,
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var currentUserId;
        var props = {
            projectRange: null,

            selection: this.props.selection,
            locale: this.props.locale,
            onSelect: this.props.onSelect,
            loading: true,
        };
        meanwhile.show(<CalendarBarSync {...props} />, 250);
        return db.start().then((userId) => {
            // load project-date-range statistics
            var criteria = {
                type: 'project-date-range',
                filters: {},
            };
            currentUserId = userId;
            return db.findOne({ table: 'statistics', criteria });
        }).then((statistics) => {
            props.projectRange = statistics;
            meanwhile.show(<CalendarBarSync {...props} />);
        }).then(() => {
            // load daily-activities statistics
            var startTime = _.get(props.projectRange, 'details.start_time');
            var endTime = _.get(props.projectRange, 'details.end_time');
            if (startTime && endTime) {
                // TODO: need to handle timezone
                var s = Moment(startTime).startOf('month');
                var e = Moment(endTime).endOf('month');
                var timeRanges = [];
                for (var m = s.clone(); m.month() <= e.month(); m.add(1, 'month')) {
                    var rangeStart = m.toISOString();
                    var rangeEnd = m.clone().endOf('month').toISOString();
                    var range = `[${rangeStart},${rangeEnd}]`;
                    timeRanges.push(range);
                }
                var criteria = {};
                if (route.component === NewsPage) {
                    criteria.type = 'daily-activities';
                    criteria.filters = _.map(timeRanges, (timeRange) => {
                        return {
                            // TODO: add role filters
                            time_range: timeRange
                        };
                    });
                } else if (route.component === NotificationsPage) {
                    criteria.type = 'daily-reactions';
                    criteria.filters = _.map(timeRanges, (timeRange) => {
                        return {
                            target_user_ids: [ currentUserId ],
                            time_range: timeRange
                        };
                    });
                } else if (route.component === UserActivityPage) {
                    criteria.type = 'daily-activities';
                    criteria.filters =  _.map(timeRanges, (timeRange) => {
                        return {
                            time_range: timeRange
                        };
                    });
                }
                return db.find({ table: 'statistics', criteria });
            }
        }).then((statistics) => {
            props.dailyActivities = statistics;
            props.loading = true;
            return <CalendarBarSync {...props} />;
        });
    },
});

var CalendarBarSync = module.exports.Sync = React.createClass({
    displayName: 'CalendarBar.Sync',
    propTypes: {
        selection: PropTypes.string,
        projectRange: PropTypes.object,
        dailyActivities: PropTypes.arrayOf(PropTypes.object),

        locale: PropTypes.instanceOf(Locale).isRequired,

        onSelect: PropTypes.func,
    },

    render: function() {
        var endOfThisMonth = Moment().endOf('month');
        var months = [];
        var multiyear = false;
        var startTime = _.get(this.props.projectRange, 'details.start_time');
        var endTime = _.get(this.props.projectRange, 'details.end_time');
        if (startTime && endTime) {
            var s = Moment(startTime).startOf('month');
            var e = Moment(endTime).endOf('month');
            if (s.year() != e.year()) {
                multiyear = true;
            }
            if (endOfThisMonth > e) {
                // always render to current month
                e = endOfThisMonth;
            }
            for (var m = s.clone(); m <= e; m.add(1, 'month')) {
                var activities = undefined;
                if (this.props.dailyActivities) {
                    var rangeStart = m.toISOString();
                    var rangeEnd = m.clone().endOf('month').toISOString();
                    var range = `[${rangeStart},${rangeEnd}]`;
                    var stats = _.find(this.props.dailyActivities, (s) => {
                        return s.filters.time_range === range;
                    });
                    if (stats) {
                        activities = stats.details;
                    }
                }
                months.push({
                    year: m.year(),
                    month: m.month() + 1,
                    activities,
                });
            }
        } else {
            // just render the current month when there's no range info yet
            months.push({
                year: endOfThisMonth.year(),
                month: endOfThisMonth.month() + 1,
            });
        }
        months.reverse();
        var calendars = _.map(months, (month, index) => {
            var props = {
                year: month.year,
                month: month.month,
                showYear: multiyear,
                selection: this.props.selection,
                dailyActivities: month.activities,
                locale: this.props.locale,
                onSelect: this.props.onSelect,
                key: index,
            };
            return <Calendar {...props} />;
        });
        return (
            <div className="calendar-bar">
                {calendars}
            </div>
        );
    },
})
