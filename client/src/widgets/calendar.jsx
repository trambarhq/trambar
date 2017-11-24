var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var DateTracker = require('utils/date-tracker');

var Locale = require('locale/locale');

require('./calendar.scss');

module.exports = React.createClass({
    displayName: 'Calendar',
    propTypes: {
        year: PropTypes.number.isRequired,
        month: PropTypes.number.isRequired,
        showYear: PropTypes.bool,
        dailyActivities: PropTypes.object,
        selection: PropTypes.string,

        locale: PropTypes.instanceOf(Locale).isRequired,

        onDateClick: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            showYear: false
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var localeData = Moment.localeData(this.props.locale.languageCode);
        var year = this.props.year;
        var month = this.props.month;
        var dailyActivities = this.props.dailyActivities;
        var selection = this.props.selection;
        var firstDay = Moment(date(year, month, 1));
        var firstDayOfWeek = localeData.firstDayOfWeek();
        var daysInMonth = firstDay.daysInMonth();
        var dayOfWeek = firstDay.day();
        var grid = [
            [ null, null, null, null, null, null, null ],
            [ null, null, null, null, null, null, null ],
            [ null, null, null, null, null, null, null ],
            [ null, null, null, null, null, null, null ],
            [ null, null, null, null, null, null, null ],
            [ null, null, null, null, null, null, null ],
        ];
        var x = 0;
        var y = dayOfWeek - firstDayOfWeek;
        if (y < 0) {
            y += 7;
        }
        for (var day = 1; day <= daysInMonth; day++) {
            grid[x][y++] = day;
            if (y >= 7) {
                y = 0;
                x++;
            }
        }
        var dayLabels = localeData.weekdaysShort();
        var isWeekend = [ true, false, false, false, false, false, true ];
        for (var i = 0; i < firstDayOfWeek; i++) {
            dayLabels.push(dayLabels.shift());
            isWeekend.push(isWeekend.shift());
        }
        var titleFormat = (this.props.showYear) ? 'MMMM YYYY' : 'MMMM';
        var title = firstDay.format(titleFormat);
        var headings = _.map(dayLabels, (label, index) => {
            var classNames = [
                isWeekend[index] ? 'weekend' : 'workweek'
            ];
            return (
                <th className={classNames.join(' ')} key={index}>
                    {label}
                </th>
            );
        });
        var rows = _.map(grid, (days) => {
            return _.map(days, (day, index) => {
                var classNames = [
                    isWeekend[index] ? 'weekend' : 'workweek'
                ];
                var label;
                var activities;
                var date;
                if (day) {
                    date = `${year}-${pad(month)}-${pad(day)}`;
                    if (dailyActivities) {
                        activities = dailyActivities[date];
                    }
                    label = day;
                } else {
                    label = '\u00a0';
                }
                if (selection && selection === date) {
                    classNames.push('selected');
                } else if (!activities) {
                    classNames.push('disabled');
                }
                if (date === DateTracker.today) {
                    classNames.push('today');
                }
                var props = {
                    className: classNames.join(' '),
                    'data-date': date,
                };
                return (
                    <td key={index} {...props}>
                        {label}
                    </td>
                );
            });
        });
        return (
            <table className="calendar" onClick={this.handleClick}>
                <thead>
                    <tr className="title">
                        <th colSpan={7}>
                            {title}
                        </th>
                    </tr>
                    <tr className="headings">
                        {headings}
                    </tr>
                </thead>
                <tbody>
                    <tr className="dates">{rows[0]}</tr>
                    <tr className="dates">{rows[1]}</tr>
                    <tr className="dates">{rows[2]}</tr>
                    <tr className="dates">{rows[3]}</tr>
                    <tr className="dates">{rows[4]}</tr>
                    <tr className="dates">{rows[5]}</tr>
                </tbody>
            </table>
        );
    },

    /**
     * Called when user clicks on the calendar
     *
     * @param  {Event} evt
     */
    handleClick: function(evt) {
        var date = evt.target.getAttribute('data-date');
        if (date) {
            if (this.props.onDateClick) {
                this.props.onDateClick({
                    type: 'dateclick',
                    target: this,
                    date,
                });
            }
        }
    },
});

function date(year, month, day) {
    return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(num) {
    var s = String(num);
    if (s.length === 1) {
        s = '0' + s;
    }
    return s;
}
