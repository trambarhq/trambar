var Moment = require('moment');

module.exports = {
    getMonthRanges,
    getTimeZoneOffset,
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
        var rangeStart = m.toISOString();
        var rangeEnd = m.clone().endOf('month').toISOString();
        var range = `[${rangeStart},${rangeEnd}]`;
        ranges.push(range);
    }
    return ranges;
}

function getTimeZoneOffset() {
    return Moment().utcOffset();
}
