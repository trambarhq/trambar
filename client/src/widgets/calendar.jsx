import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';

import './calendar.scss';

class Calendar extends PureComponent {
    static displayName = 'Calendar';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env, year, month, selection, showYear } = this.props;
        let { localeCode } = env.locale;
        let localeData = Moment.localeData(localeCode);
        let firstDay = Moment(date(year, month, 1)).locale(localeCode);
        let firstDayOfWeek = localeData.firstDayOfWeek();
        let daysInMonth = firstDay.daysInMonth();
        let dayOfWeek = firstDay.day();
        let grid = [
            [ null, null, null, null, null, null, null ],
            [ null, null, null, null, null, null, null ],
            [ null, null, null, null, null, null, null ],
            [ null, null, null, null, null, null, null ],
            [ null, null, null, null, null, null, null ],
            [ null, null, null, null, null, null, null ],
        ];
        let x = 0;
        let y = dayOfWeek - firstDayOfWeek;
        if (y < 0) {
            y += 7;
        }
        for (let day = 1; day <= daysInMonth; day++) {
            grid[x][y++] = day;
            if (y >= 7) {
                y = 0;
                x++;
            }
        }
        let dayLabels = _.slice(localeData.weekdaysShort());
        let isWeekend = [ true, false, false, false, false, false, true ];
        for (let i = 0; i < firstDayOfWeek; i++) {
            dayLabels.push(dayLabels.shift());
            isWeekend.push(isWeekend.shift());
        }
        let titleFormat = (showYear) ? 'MMMM YYYY' : 'MMMM';
        let title = firstDay.format(titleFormat);
        let headings = _.map(dayLabels, (label, index) => {
            let classNames = [
                isWeekend[index] ? 'weekend' : 'workweek'
            ];
            return (
                <th className={classNames.join(' ')} key={index}>
                    {label}
                </th>
            );
        });
        let rows = _.map(grid, (days) => {
            return _.map(days, (day, index) => {
                let classNames = [
                    isWeekend[index] ? 'weekend' : 'workweek'
                ];
                let label, date, url;
                if (day) {
                    date = `${year}-${pad(month)}-${pad(day)}`;
                    label = day;
                    url = this.getDateURL(date);
                } else {
                    label = '\u00a0';
                }
                if (selection && selection === date) {
                    classNames.push('selected');
                }
                if (date === env.date) {
                    classNames.push('today');
                }
                return (
                    <td key={index} className={classNames.join(' ')}>
                        <a href={url}>{label}</a>
                    </td>
                );
            });
        });
        return (
            <table className="calendar">
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
    }

    /**
     * Get URL for a date
     *
     * @param  {String} date
     *
     * @return {String|undefined}
     */
    getDateURL(date) {
        let { onDateURL } = this.props;
        if (onDateURL) {
            return onDateURL({
                type: 'dateurl',
                target: this,
                date,
            });
        }
    }
}

function date(year, month, day) {
    return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(num) {
    let s = String(num);
    if (s.length === 1) {
        s = '0' + s;
    }
    return s;
}

Calendar.defaultProps = {
    showYear: false
};

export {
    Calendar as default,
    Calendar,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Calendar.propTypes = {
        year: PropTypes.number.isRequired,
        month: PropTypes.number.isRequired,
        showYear: PropTypes.bool,
        selection: PropTypes.string,

        env: PropTypes.instanceOf(Environment).isRequired,

        onDateURL: PropTypes.func,
    }
}
