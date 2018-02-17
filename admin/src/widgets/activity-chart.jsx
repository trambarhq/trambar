var _ = require('lodash');
var Promise = require('promise');
var React = require('react'), PropTypes = React.PropTypes;
var Chartist = require('widgets/chartist');
var Moment = require('moment');
var DateTracker = require('utils/date-tracker');
var Memoize = require('utils/memoize');

var Locale = require('locale/locale');
var Theme = require('theme/theme');

var StoryTypes = require('objects/types/story-types');

require('./activity-chart.scss');

module.exports = React.createClass({
    displayName: 'ActivityChart',
    propTypes: {
        statistics: PropTypes.object,

        locale: PropTypes.instanceOf(Locale),
        theme: PropTypes.instanceOf(Theme),
    },

    render: function() {
        return (
            <div className="activity-chart">
                <h2>{this.props.children}</h2>
                {this.renderLegend()}
                {this.renderChart()}
            </div>
        );
    },

    renderChart: function() {
        if (!this.props.statistics) {
            return (
                <div className="scroll-container">
                    <div className="contents no-data" />
                </div>
            );
        }
        var today = Moment(DateTracker.today);
        var rangeStart = Moment(this.props.statistics.range.start);
        var rangeEnd = Moment(this.props.statistics.range.end);

        var endOfThisMonth = today.clone().endOf('month');
        var startDate = rangeStart.clone().startOf('month');
        var endDate = rangeEnd.clone().endOf('month');

        if (endOfThisMonth.diff(endDate, 'month') <= 1) {
            // use the current month when there were activities in this or
            // the previous month
            endDate = endOfThisMonth;
        } else {
            // otherwise add one month of no activities
            endDate.add(1, 'month');
        }

        var dates = getDateStrings(startDate, endDate);
        var series = getActivitySeries(this.props.statistics.daily, dates);
        var upperRange = getUpperRange(series, true);
        var labels = getDateStrings(startDate, endDate);
        var chartProps = {
            type: 'bar',
            data: { labels, series },
            options: {
                fullWidth: true,
                height: 200,
                chartPadding: {
                    left: -25,
                    right: 30
                },
                stackBars: true,
                high: upperRange,
                low: 0,
                axisX: {
                    labelInterpolationFnc: function(date) {
                        var day = getDay(date);
                        if (day === 1) {
                            return date;
                        } else if (day > 10 && date == DateTracker.today){
                            return 'Today';
                        }
                        return '';
                    }
                },
            },
            onDraw: this.handleDraw,
        };
        var width = Math.round(labels.length * 0.75) + 'em';
        return (
            <div className="scroll-container">
                <div className="contents" style={{ width }}>
                    <Chartist {...chartProps} />
                </div>
            </div>
        );
    },

    /**
     * Render legend for data series
     *
     * @return {ReactElement}
     */
    renderLegend: function() {
        if (!this.props.statistics) {
            return null;
        }
        var t = this.props.locale.translate;
        var stats = this.props.statistics.to_date;
        var indices = {};
        _.each(StoryTypes, (type, index) => {
            if (stats[type] > 0) {
                indices[type] = index;
            }
        });
        var items = _.map(indices, (index, type) => {
            var props = {
                series: String.fromCharCode('a'.charCodeAt(0) + index),
                label: t(`activity-chart-legend-${type}`),
            };
            return <LegendItem key={index} {...props} />;
        });
        if (_.isEmpty(items)) {
            items = '\u00a0';
        }
        return <div className="legend">{items}</div>;
    },

    handleDraw: function(cxt) {
        // move y-axis to the right side
        if(cxt.type === 'label' && cxt.axis.units.pos === 'y') {
            cxt.element.attr({
                x: cxt.axis.chartRect.width() + 20
            });
        }
        // style grid line differently when it's the first day
        // of the month or today
        if (cxt.type === 'grid' && cxt.axis.units.pos === 'x') {
            var date = cxt.axis.ticks[cxt.index];
            var day = getDay(date);
            if (day === 1) {
                cxt.element.addClass('month-start');
            } else if (date === DateTracker.today) {
                cxt.element.addClass('today');
            }
        }
    },
});

var getDateStrings = Memoize(function(startDate, endDate) {
    var dates = [];
    for (var d = startDate.clone(); d <= endDate; d.add(1, 'day')) {
        dates.push(d.format('YYYY-MM-DD'));
    }
    return dates;
});

var getDateLabels = Memoize(function(startDate, endDate) {
    var labels = [];
    for (var d = startDate.clone(); d <= endDate; d.add(1, 'month')) {
        labels.push(d.format('ll'));

        var days = d.daysInMonth();
        for (var i = 1; i < days; i++) {
            labels.push(null);
        }
    }
    return labels;
});

var getActivitySeries = Memoize(function(activities, dates) {
    return _.map(StoryTypes, (type) => {
        // don't include series that are completely empty
        var empty = true;
        var series = _.map(dates, (date) => {
            var value = _.get(activities, [ date, type ], 0);
            if (value) {
                empty = false;
            }
            return value;
        });
        return (empty) ? [] : series;
    });
});

var getUpperRange = Memoize(function(series, additive) {
    var highest = 0;
    if (additive) {
        var sums = [];
        _.each(series, (values) => {
            _.each(values, (value, index) => {
                sums[index] = (sums[index]) ? sums[index] + value : value;
            });
        });
        if (!_.isEmpty(sums)) {
            highest = _.max(sums);
        }
    } else {
        _.each(series, (values) => {
            var max = _.max(values);
            if (max > highest) {
                highest = max;
            }
        });
    }
    if (highest <= 20) {
        return 20;
    } else if (highest <= 50) {
        return 50;
    } else {
        return Math.ceil(highest / 100) * 100;
    }
});

function getDay(date) {
    return parseInt(date.substr(8));
}

function LegendItem(props) {
    return (
        <div className="item">
            <svg className="ct-chart-bar" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
                <g className={`ct-series ct-series-${props.series}`}>
                    <line className="ct-bar" x1={0} y1={5} x2={10} y2={5} />
                </g>
            </svg>
            <span className="label">
                {props.label}
            </span>
        </div>
    )
}
