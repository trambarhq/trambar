import Moment from 'moment';

/**
 * Return time range of given date
 *
 * @param  {string|Moment} date
 *
 * @return {string[]}
 */
function getDayRange(date) {
  let s = (date instanceof Moment) ? date : Moment(date);
  let e = s.clone().endOf('day');
  let rangeStart = s.toISOString();
  let rangeEnd = e.toISOString();
  let range = `[${rangeStart},${rangeEnd}]`;
  return range;
}

/**
 * Return time ranges of months that cover that a given time span
 *
 * @param  {string|Moment} startTime
 * @param  {string|Moment} endTime
 *
 * @return {string[]}
 */
function getMonthRanges(startTime, endTime) {
  let ms = (startTime instanceof Moment) ? startTime : Moment(startTime);
  let me = (endTime instanceof Moment) ? endTime : Moment(endTime);
  let s = ms.startOf('month');
  let e = me.endOf('month');
  let ranges = [];
  for (let m = s.clone(); m <= e; m.add(1, 'month')) {
    let start = m.toISOString();
    let end = m.clone().endOf('month').toISOString();
    let range = `[${start},${end}]`;
    ranges.push(range);
  }
  return ranges;
}

/**
 * Return a list of day between the start time and end time (YYYY-MM-DD)
 *
 * @param  {string|Moment} startTime
 * @param  {string|Moment} endTime
 *
 * @return {string[]}
 */
function getDates(startTIme, endTime) {
  let ms = (startTime instanceof Moment) ? startTime : Moment(startTime);
  let me = (endTime instanceof Moment) ? endTime : Moment(endTime);
  let s = ms.startOf('day');
  let e = me.endOf('day');
  let dates = [];
  for (let m = s.clone(); m <= e; m.add(1, 'day')) {
    let date = m.format('YYYY-MM-DD');
    dates.push(date);
  }
  return dates;
}

/**
 * Return the time offset from UTC
 *
 * @return {number}
 */
function getTimeZoneOffset() {
  return Moment().utcOffset();
}

export {
  getDayRange,
  getMonthRanges,
  getTimeZoneOffset,
  getDates,
};
