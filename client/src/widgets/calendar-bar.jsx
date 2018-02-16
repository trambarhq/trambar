var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');
var StatisticsUtils = require('objects/utils/statistics-utils');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Calendar = require('widgets/calendar');

require('./calendar-bar.scss');

module.exports = Relaks.createClass({
    displayName: 'CalendarBar',
    propTypes: {
        settings: PropTypes.object.isRequired,
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
            dailyActivities: null,

            settings: this.props.settings,
            route: this.props.route,
            locale: this.props.locale,
        };
        meanwhile.show(<CalendarBarSync {...props} />, 1000);
        return db.start().then((userId) => {
            var params = _.assign({ user_id: userId }, this.props.settings.statistics);
            return StatisticsUtils.fetch(db, params);
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
        settings: PropTypes.object.isRequired,
        dailyActivities: PropTypes.object,

        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    render: function() {
        var endOfThisMonth = Moment().endOf('month');
        var months = [];
        var multiyear = false;
        var startTime = _.get(this.props.dailyActivities, 'range.start');
        var endTime = _.get(this.props.dailyActivities, 'range.end');
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
                onDateURL: this.handleDateURL,
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
     * @param  {Object} evt
     *
     * @return {String|undefined}
     */
    handleDateURL: function(evt) {
        var activities = _.get(this.props.dailyActivities, [ 'daily', evt.date ]);
        if (activities) {
            var route = this.props.route;
            var params = _.assign({ date: evt.date }, this.props.settings.route);
            var url = route.find(route.component, params);
            return url;
        }
    },
})
