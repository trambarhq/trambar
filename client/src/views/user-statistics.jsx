var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Chartist = require('widgets/chartist');
var Moment = require('moment');
var Memoize = require('utils/memoize');
var DateTracker = require('utils/date-tracker');
var StoryTypes = require('objects/types/story-types');

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

require('./user-statistics.scss');

module.exports = React.createClass({
    displayName: 'UserStatistics',
    mixins: [ UpdateCheck ],
    propTypes: {
        chartType: PropTypes.oneOf([ 'bar', 'line', 'pie' ]),
        user: PropTypes.object,
        dailyActivities: PropTypes.object,
        today: PropTypes.string,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="user-statistics">
                {this.renderLegend()}
                {this.renderChart()}
            </div>
        );
    },

    /**
     * Render legend for data series
     *
     * @return {ReactElement|null}
     */
    renderLegend: function() {
        if (!this.props.chartType) {
            return null;
        }
        var t = this.props.locale.translate;
        var details = _.get(this.props.dailyActivities, 'details', {});
        var dates = getDates(DateTracker.today, 14);
        var indices = getActivityIndices(details, dates);
        var items = _.map(indices, (index, type) => {
            var props = {
                series: String.fromCharCode('a'.charCodeAt(0) + index),
                label: t(`user-statistics-legend-${type}`),
            };
            return <LegendItem key={index} {...props} />;
        });
        if (_.isEmpty(items)) {
            items = '\u00a0';
        }
        return <div className="legend">{items}</div>;
    },

    /**
     * Render currently selected chart type
     *
     * @return {ReactElement|null}
     */
    renderChart: function() {
        switch (this.props.chartType) {
            case 'bar': return this.renderBarChart();
            case 'line': return this.renderLineChart();
            case 'pie': return this.renderPieChart();
            default: return null;
        }
    },

    /**
     * Render a stacked bar chart showing activities on each day
     *
     * @return {ReactElement}
     */
    renderBarChart: function() {
        var details = _.get(this.props.dailyActivities, 'details', {});
        var dates = getDates(DateTracker.today, 14);
        var series = getActivitySeries(details, dates);
        var upperRange = getUpperRange(series, true);
        var labels = getDateLabel(dates, this.props.locale.languageCode);
        var chartProps = {
            type: 'bar',
            data: { labels, series },
            options: {
                stackBars: true,
                axisY: {
                    labelInterpolationFnc: function(value) {
                        return value;
                    }
                },
                high: upperRange,
                low: 0,
            }
        };
        return <Chartist {...chartProps} />;
    },

    /**
     * Render a line chart showing activities on each day
     *
     * @return {ReactElement}
     */
    renderLineChart: function() {
        var details = _.get(this.props.dailyActivities, 'details', {});
        var dates = getDates(DateTracker.today, 14);
        var series = getActivitySeries(details, dates);
        var upperRange = getUpperRange(series, false);
        var labels = getDateLabel(dates, this.props.locale.languageCode);
        var chartProps = {
            type: 'line',
            data: { labels, series },
            options: {
                fullWidth: true,
                chartPadding: {
                    right: 10
                },
                showPoint: false,
                high: upperRange,
                low: 0,
            }
        };
        return <Chartist {...chartProps} />;
    },

    /**
     * Render a pie chart showing relative frequencies of activity types
     *
     * @return {ReactElement}
     */
    renderPieChart: function() {
        var details = _.get(this.props.dailyActivities, 'details', {});
        var dates = getDates(DateTracker.today, 14);
        var series = getActivitySeries(details, dates);
        var seriesTotals = _.map(series, _.sum);
        var chartProps = {
            type: 'pie',
            data: { series: seriesTotals },
            options: {
                labelInterpolationFnc: function(value) {
                    if (value) {
                        return value;
                    }
                }
            }
        };
        return <Chartist {...chartProps} />;
    },
});

var getDates = function(today, count) {
    var m = Moment(today);
    var dates = _.times(count, () => {
        var date = m.format('YYYY-MM-DD');
        m.subtract(1, 'day');
        return date;
    });
    return _.reverse(dates);
}

var getActivityIndices = Memoize(function(activities, dates) {
    var present = {};
    _.each(dates, (date) => {
        var counts = activities[date];
        _.forIn(counts, (count, type) => {
            if (count) {
                present[type] = true;
            }
        });
    });
    var indices = {};
    _.each(StoryTypes, (type, index) => {
        if (present[type]) {
            indices[type] = index;
        }
    });
    return indices;
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

var getDateLabel = Memoize(function(dates, languageCode) {
    return _.map(dates, (date) => {
        return Moment(date).format('dd');
    });
});

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
