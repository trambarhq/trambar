var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Chartist = require('widgets/chartist');
var Moment = require('moment');
var Memoize = require('utils/memoize');
var DateTracker = require('utils/date-tracker');
var StoryTypes = require('objects/types/story-types');

var Route = require('routing/route');
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
        selectedDate: PropTypes.string,
        today: PropTypes.string,

        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return list of dates on which stats are shown
     *
     * @return {Array<String>}
     */
    getDates: function() {
        var m;
        if (this.props.selectedDate) {
            m = Moment(this.props.selectedDate).add(6, 'day');
        } else {
            m = Moment(this.props.today);
        }
        var dates = [];
        for (var i = 0; i < 14; i++) {
            var date = m.format('YYYY-MM-DD');
            dates.unshift(date);
            m.subtract(1, 'day');
        }
        return dates;
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
        var dates = this.getDates();
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
        var dates = this.getDates();
        var series = getActivitySeries(details, dates);
        var upperRange = getUpperRange(series, true);
        var labels = getDateLabel(dates, this.props.locale.localeCode);
        var chartProps = {
            type: 'bar',
            data: { labels, series, meta: 1 },
            options: {
                stackBars: true,
                axisY: {
                    labelInterpolationFnc: function(value) {
                        return value;
                    }
                },
                chartPadding: {
                    right: 10
                },
                high: upperRange,
                low: 0,
            },
            onDraw: this.handleChartDraw,
            onClick: this.handleChartClick,
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
        var dates = this.getDates();
        var series = getActivitySeries(details, dates);
        var upperRange = getUpperRange(series, false);
        var labels = getDateLabel(dates, this.props.locale.localeCode);
        var chartProps = {
            type: 'line',
            data: { labels, series },
            options: {
                fullWidth: true,
                chartPadding: {
                    right: 20
                },
                showPoint: false,
                high: upperRange,
                low: 0,
            },
            onDraw: this.handleChartDraw,
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
        var dates = this.getDates();
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
                },
            },
        };
        return <Chartist {...chartProps} />;
    },

    /**
     * Called when Chartist is drawing a chart
     *
     * @param  {Object} data
     */
    handleChartDraw: function(data) {
        if (data.type === 'grid') {
            var label;
            var index = data.index;
            if (this.props.selectedDate) {
                if (index === 7) {
                    var m = Moment(this.props.selectedDate);
                    var locale = this.props.locale.localeCode;
                    label = m.locale(locale).format('l');
                }
            } else {
                if (index === 13) {
                    var t = this.props.locale.translate;
                    label = t('user-statistics-today');
                }
            }
            if (label) {
                var x;
                if (this.props.chartType === 'bar') {
                    // add missing grid line
                    var line = new Chartist.Svg('line');
                    line.attr({
                        x1: data.x2 + data.axis.stepLength,
                        y1: data.y1,
                        x2: data.x2 + data.axis.stepLength,
                        y2: data.y2,
                        class: 'ct-grid ct-vertical',
                    });
                    data.group.append(line);
                    x = data.x2 + data.axis.stepLength * 0.5;
                } else {
                    x = data.x2;
                }
                var y = data.y1 + 12;
                var text = new Chartist.Svg('text');
                text.text(label);
                text.attr({
                    x: x,
                    y: y,
                    'text-anchor': 'middle',
                    class: 'date-label',
                });
                data.group.append(text);

                var arrow = new Chartist.Svg('text');
                arrow.text('\uf0dd');
                arrow.attr({
                    x: x,
                    y: y + 8,
                    'text-anchor': 'middle',
                    class: 'date-arrow',
                });
                data.group.append(arrow);
            }
        } else if (data.type === 'bar') {
            // add mouseover title
            var t = this.props.locale.translate;
            var count = data.value.y;
            var type = data.series.name;
            var objects = t(`user-statistics-tooltip-$count-${type}`, count);
            var m = Moment(data.meta);
            var locale = this.props.locale.localeCode;
            var date = m.locale(locale).format('l');
            var label = `${objects}\n${date}`;
            var title = new Chartist.Svg('title');
            title.text(label);
            data.element.append(title);
            data.element.attr({ 'data-date': data.meta });
        }
    },

    /**
     * Called when user clicks on the chart
     *
     * @param  {Event} evt
     */
    handleChartClick: function(evt) {
        var date = evt.target.getAttribute('data-date');
        if (date) {
            // go to the user's personal page on that date
            var route = this.props.route;
            var params = {
                schema: route.parameters.schema,
                user: this.props.user.id,
                date: date,
            };
            route.push(require('pages/person-page'), params);
        }
    },
});

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
            var meta = date;
            if (value) {
                empty = false;
            }
            return { meta, value };
        });
        if (empty) {
            return [];
        }
        return {
            name: type,
            data: series,
        };
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
    if (highest <= 18) {
        return 20;
    } else if (highest <= 45) {
        return 50;
    } else {
        return Math.ceil(highest / 100) * 100;
    }
});

var getDateLabel = Memoize(function(dates, localeCode) {
    return _.map(dates, (date) => {
        return Moment(date).locale(localeCode).format('dd');
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
