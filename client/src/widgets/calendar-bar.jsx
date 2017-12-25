var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');
var DateUtils = require('utils/date-utils');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');

var NewsPage = require('pages/news-page');
var NotificationsPage = require('pages/notifications-page');
var PersonPage = require('pages/person-page');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Calendar = require('widgets/calendar');

require('./calendar-bar.scss');

module.exports = Relaks.createClass({
    displayName: 'CalendarBar',
    propTypes: {
        options: PropTypes.object.isRequired,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var currentUserId;
        var props = {
            projectRange: null,
            dailyActivities: null,

            route: this.props.route,
            locale: this.props.locale,
        };
        meanwhile.show(<CalendarBarSync {...props} />, 1000);
        return db.start().then((userId) => {
            // load story-date-range statistics
            var criteria = {
                type: 'story-date-range',
                filters: {},
            };
            currentUserId = userId;
            return db.findOne({ table: 'statistics', criteria });
        }).then((statistics) => {
            props.projectRange = statistics;
            return meanwhile.show(<CalendarBarSync {...props} />);
        }).then(() => {
            // load daily-activities statistics
            var startTime = _.get(props.projectRange, 'details.start_time');
            var endTime = _.get(props.projectRange, 'details.end_time');
            var timeRanges = DateUtils.getMonthRanges(startTime, endTime);
            var tzOffset = DateUtils.getTimeZoneOffset();
            var stats = this.props.options.statistics;
            var criteria = {
                type: stats.type,
                filters: _.map(timeRanges, (timeRange) => {
                    return _.extend({
                        time_range: timeRange,
                        tz_offset: tzOffset
                    }, stats.filters);
                }),
            };
            return db.find({ table: 'statistics', criteria });
        }).then((statistics) => {
            props.dailyActivities = statistics;
            return <CalendarBarSync {...props} />;
        });
    },
});

var CalendarBarSync = module.exports.Sync = React.createClass({
    displayName: 'CalendarBar.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        projectRange: PropTypes.object,
        dailyActivities: PropTypes.arrayOf(PropTypes.object),

        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    render: function() {
        var endOfThisMonth = Moment().endOf('month');
        var months = [];
        var multiyear = false;
        var startTime = _.get(this.props.projectRange, 'details.start_time');
        var endTime = _.get(this.props.projectRange, 'details.end_time');
        var selectedDate = this.props.route.parameters.date;
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
                months.push({
                    year: m.year(),
                    month: m.month() + 1,
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
                selection: selectedDate,
                locale: this.props.locale,
                onDateUrl: this.handleDateUrl,
            };
            return <Calendar key={index} {...props} />;
        });
        return (
            <div className="calendar-bar">
                {calendars}
            </div>
        );
    },

    /**
     * Called when calendar needs the URL for the
     *
     * @param  {[type]} evt
     *
     * @return {[type]}
     */
    handleDateUrl: function(evt) {
        var date = evt.date;
        var hasActivities = _.some(this.props.dailyActivities, (stats) => {
            if (stats.details[date]) {
                return true;
            }
        });
        if (hasActivities) {
            var route = this.props.route;
            var params = _.omit(route.parameters, 'date', 'roles', 'search', 'story');
            params.date = date;
            var url = route.find(route.component, params);
            return url;
        }
    },
})
