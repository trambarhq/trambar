var Moment = require('moment');
var DateTracker = require('utils/date-tracker');

module.exports = {
    getMonthRanges,
    getTimeZoneOffset,
    getDates,
};

/**
 * Return time ranges of months that cover that a given time span
 *
 * @param  {String} startTime
 * @param  {String} endTime
 *
 * @return {Array<String>}
 */
function getMonthRanges(startTime, endTime) {
    var s = Moment(startTime).startOf('month');
    var e = Moment(endTime).endOf('month');
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
 * @param  {String} startTime
 * @param  {String} endTime
 *
 * @return {Array<String>}
 */
function getDates(startTIme, endTime) {
    var s = Moment(startTime).startOf('day');
    var e = Moment(endTime).endOf('day');
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
