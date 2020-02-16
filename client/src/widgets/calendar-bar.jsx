import _ from 'lodash';
import React from 'react';
import Relaks, { useProgress } from 'relaks';
import Moment from 'moment';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';

// widgets
import { Calendar } from './calendar.jsx';

import './calendar-bar.scss';

/**
 * Component in top nav that shows a list of calendars, used to navigate
 * to news of a particular date.
 */
async function CalendarBar(props) {
  const { database, route, env, settings } = props;
  const db = database.use({ by: this });
  const selection = route.params.date;
  const [ show ] = useProgress();

  render();
  const currentUserID = await db.start();
  const currentUser = await UserFinder.findUser(db, currentUserID);
  const params = { ...settings.statistics };
  if (params.user_id === 'current') {
    params.user_id = currentUser.id;
  }
  if (params.public === 'guest') {
    params.public = (currentUser.type === 'guest');
  }
  const dailyActivities = await StatisticsFinder.find(db, params);
  render();

  function render() {
    const months = getMonths();
    show(
      <div className="calendar-bar">
        {_.map(months, renderCalendar)}
      </div>
    , 'initial');
  }

  function renderCalendar(mon, i) {
    const { year, month, showYear } = mon;
    const props = { year, month, showYear, selection, env };
    const handleDateURL = (evt) => {
      const activities = dailyActivities?.daily?.[evt.date];
      if (activities) {
        const params = { date: evt.date, ...settings.route };
        const url = route.find(route.name, params);
        return url;
      }
    };
    const key = `${year}-${month}`;
    return <Calendar key={key} {...props} onDateURL={handleDateURL} />;
  }

  function getMonths() {
    const endOfThisMonth = Moment().endOf('month');
    const months = [];
    const startTime = dailyActivities?.range?.start;
    const endTime = dailyActivities?.range?.end;
    let multiyear = false;
    if (startTime && endTime) {
      let s = Moment(startTime).startOf('month');
      let e = Moment(endTime).endOf('month');
      if (s.year() != e.year()) {
        multiyear = true;
      }
      if (endOfThisMonth > e) {
        // always render to current month
        e = endOfThisMonth;
      }
      for (let m = s.clone(); m <= e; m.add(1, 'month')) {
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
    for (let month of months) {
      month.showYear = multiyear;
    }
    return months;
  }
}

const component = Relaks.memo(CalendarBar);

export {
  component as default,
  component as CalendarBar,
};
