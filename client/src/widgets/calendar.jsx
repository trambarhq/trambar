var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');

var Locale = require('locale/locale');

require('./calendar.scss');

module.exports = React.createClass({
    displayName: 'Calendar',
    propTypes: {
        year: PropTypes.number.isRequired,
        month: PropTypes.number.isRequired,

        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var localeData = Moment.localeData(this.props.locale.languageCode);
        var firstDay = Moment(date(this.props.year, this.props.month, 1));
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
        var monthLabel = firstDay.format('MMMM');
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
                var label = day || '\u00a0';
                return (
                    <td className={classNames.join(' ')} key={index}>
                        {label}
                    </td>
                );
            });
        });
        return (
            <table className="calendar">
                <thead>
                    <tr className="title">
                        <th colSpan={7}>
                            {monthLabel}
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
