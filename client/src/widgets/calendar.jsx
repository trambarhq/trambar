import _ from 'lodash';
import Moment from 'moment';
import React from 'react';

import './calendar.scss';

/**
 * A component that draws a monthly calendar. Statistics passed as prop
 * determines whether a day is highlighted and clickable.
 */
function Calendar(props) {
  const { env, year, month, selection, showYear, onDateURL } = props;
  const { localeCode } = env.locale;
  const localeData = Moment.localeData(localeCode);
  const firstDay = Moment(date(year, month, 1)).locale(localeCode);
  const firstDayOfWeek = localeData.firstDayOfWeek();
  const daysInMonth = firstDay.daysInMonth();
  const dayOfWeek = firstDay.day();
  const grid = [
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
  const dayLabels = _.slice(localeData.weekdaysShort());
  const isWeekend = [ true, false, false, false, false, false, true ];
  for (let i = 0; i < firstDayOfWeek; i++) {
    dayLabels.push(dayLabels.shift());
    isWeekend.push(isWeekend.shift());
  }
  const titleFormat = (showYear) ? 'MMMM YYYY' : 'MMMM';
  const title = _.capitalize(firstDay.format(titleFormat));
  const headings = _.map(dayLabels, (label, index) => {
    let classNames = [
      isWeekend[index] ? 'weekend' : 'workweek'
    ];
    return (
      <th className={classNames.join(' ')} key={index}>
        {label}
      </th>
    );
  });
  let firstURL;
  let monthClassName;
  const rows = _.map(grid, (days) => {
    return _.map(days, (day, index) => {
      let classNames = [
        isWeekend[index] ? 'weekend' : 'workweek'
      ];
      let label, date, url;
      if (day) {
        date = `${year}-${pad(month)}-${pad(day)}`;
        label = day;
        url = (onDateURL) ? onDateURL({ date }) : undefined;
        if (url && !firstURL) {
          firstURL = url;
        }
      } else {
        label = '\u00a0';
      }
      if (selection && selection === date) {
        classNames.push('selected');
        monthClassName = 'selected';
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
          <th colSpan={7} className={monthClassName}>
            <a href={firstURL}>{title}</a>
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

import Environment from 'common/env/environment.mjs';

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
