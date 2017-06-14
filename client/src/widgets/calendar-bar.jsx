var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var OnDemand = require('widgets/on-demand');
var Calendar = require('widgets/calendar');

require('./calendar-bar.scss');

module.exports = Relaks.createClass({
    displayName: 'CalendarBar',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            projectRange: null,

            locale: this.props.locale,
            loading: true,
        };
        meanwhile.show(<CalendarBarSync {...props} />);
        return db.start().then((userId) => {
            // load project-date-range statistics
            var criteria = {
                type: 'project-date-range',
                filters: {},
            };
            return db.findOne({ table: 'statistics', criteria });
        }).then((statistics) => {
            console.log(statistics);
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
                var criteria = {
                    type: 'daily-activities',
                    filters: _.map(timeRanges, (timeRange) => {
                        return {
                            // TODO: add role filters
                            time_range: timeRange
                        };
                    })
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
        projectRange: PropTypes.object,

        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    render: function() {
        var now = Moment();
        var months = [];
        var startTime = _.get(this.props.projectRange, 'details.start_time');
        var endTime = _.get(this.props.projectRange, 'details.end_time');
        var dateRange = null;
        if (startTime && endTime) {
            var s = Moment(startTime);
            var e = Moment(endTime);
            dateRange = {
                start: s.format('YYYY-MM-DD'),
                end: s.format('YYYY-MM-DD'),
            };
            if (now > e) {
                // always render to current month
                e = now;
            }
            for (var m = s.clone(); m.month() <= e.month(); m.add(1, 'month')) {
                months.push({
                    year: m.year(),
                    month: m.month() + 1,
                });
            }
        } else {
            // just render the current month when there's no range info yet
            months.push({
                year: now.year(),
                month: now.month() + 1,
            });
        }
        months.reverse();
        var calendars = _.map(months, (month, index) => {
            var props = {
                year: month.year,
                month: month.month,
                locale: this.props.locale,
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
