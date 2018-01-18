var Moment = require('moment');
var DateTracker = require('utils/date-tracker');

module.exports = {
    getDayRange,
    getMonthRanges,
    getTimeZoneOffset,
    getDates,
};

/**
 * Return time range of given date
 *
 * @param  {String|Moment} date
 *
 * @return {Array<String>}
 */
function getDayRange(date) {
    var s = (date instanceof Moment) ? date : Moment(date);
    var e = s.clone().endOf('day');
    var rangeStart = s.toISOString();
    var rangeEnd = e.toISOString();
    var range = `[${rangeStart},${rangeEnd}]`;
    return range;
}

/**
 * Return time ranges of months that cover that a given time span
 *
 * @param  {String|Moment} startTime
 * @param  {String|Moment} endTime
 *
 * @return {Array<String>}
 */
function getMonthRanges(startTime, endTime) {
    var ms = (startTime instanceof Moment) ? startTime : Moment(startTime);
    var me = (endTime instanceof Moment) ? endTime : Moment(endTime);
    var s = ms.startOf('month');
    var e = me.endOf('month');
    var ranges = [];
    for (var m = s.clone(); m <= e; m.add(1, 'month')) {
        var start = m.toISOString();
        var end = m.clone().endOf('month').toISOString();
        var range = `[${start},${end}]`;
        ranges.push(range);
    }
    return ranges;
}

/**
 * Return a list of day between the start time and end time (YYYY-MM-DD)
 *
 * @param  {String|Moment} startTime
 * @param  {String|Moment} endTime
 *
 * @return {Array<String>}
 */
function getDates(startTIme, endTime) {
    var ms = (startTime instanceof Moment) ? startTime : Moment(startTime);
    var me = (endTime instanceof Moment) ? endTime : Moment(endTime);
    var s = ms.startOf('day');
    var e = me.endOf('day');
    var dates = [];
    for (var m = s.clone(); m <= e; m.add(1, 'day')) {
        var date = m.format('YYYY-MM-DD');
        dates.push(date);
    }
    return dates;
}

/**
 * Return the time offset from UTC
 *
 * @return {Number}
 */
function getTimeZoneOffset() {
    return Moment().utcOffset();
}
