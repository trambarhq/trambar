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
        chartRange: PropTypes.oneOf([ 'biweekly', 'monthly', 'full' ]),
        dailyActivities: PropTypes.object,
        selectedDate: PropTypes.string,
        today: PropTypes.string,
        user: PropTypes.object,

        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            chartRange: 'biweekly'
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var state = {
            dates: [],
            labels: [],
            series: [],
            indices: [],
            upperRange: 0,
            selectedDateIndex: -1,
        };
        this.updateSeries(state, this.props);
        return state;
    },

    /**
     * Update data and labels on props change
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var diff = _.shallowDiff(nextProps, this.props);
        if (diff.chartRange || diff.dailyActivities || diff.selectedDate || diff.today) {
            var nextState = _.clone(this.state);
            this.updateSeries(nextState, nextProps);
            this.setState(nextState);
        }
    },

    /**
     * Update data and labels
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateSeries: function(nextState, nextProps) {
        var date = nextProps.selectedDate || nextProps.today;
        var activities = _.get(nextProps.dailyActivities, 'daily', {});
        var localeCode = nextProps.locale.localeCode;
        var t = nextProps.locale.translate;
        switch (nextProps.chartRange) {
            case 'biweekly':
                var offset = (nextProps.selectedDate) ? 6 : 0;
                nextState.dates = getTwoWeeks(date, offset);
                nextState.labels = getDateOfWeekLabels(nextState.dates, localeCode);
                break;
            case 'monthly':
                nextState.dates = getMonth(date);
                nextState.labels = getDateOfMonthLabels(nextState.dates, localeCode);
                break;
            case 'full':
                var range = _.get(nextProps.dailyActivities, 'range');
                if (range) {
                    nextState.dates = getMonths(range.start, range.end);
                } else {
                    nextState.dates = getMonth(nextProps.today);
                }
                nextState.labels = getMonthLabels(nextState.dates, localeCode);
                break;
        }
        var additive =  (nextProps.chartType === 'bar') ? true : false;
        nextState.series = getActivitySeries(activities, nextState.dates);
        nextState.upperRange = getUpperRange(nextState.series, additive);
        nextState.indices = getActivityIndices(activities, nextState.dates);
        nextState.selectedDateIndex = _.indexOf(nextState.dates, date);
        if (nextProps.selectedDate) {
            var m = Moment(nextProps.selectedDate);
            nextState.selectedDateLabel = m.locale(localeCode).format('l');
        } else {
            nextState.selectedDateLabel = t('user-statistics-today');
        }
        var dateLabels = getDateLabels(nextState.dates, localeCode);
        nextState.tooltips = _.map(nextState.series, (series) => {
            return _.map(series.data, (count, index) => {
                var objects = t(`user-statistics-tooltip-$count-${series.name}`, count);
                var dateLabel = dateLabels[index];
                return `${objects}\n${dateLabel}`;
            });
        });
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
        var items = _.map(this.state.indices, (index, type) => {
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
        var chartProps = {
            type: 'bar',
            data: {
                labels: this.state.labels,
                series: this.state.series,
            },
            options: {
                stackBars: true,
                chartPadding: {
                    left: -25,
                    right: 30
                },
                high: this.state.upperRange,
                low: 0,
            },
            onDraw: this.handleChartDraw,
            onClick: this.handleChartClick,
        };
        return (
            <ChartContainer scrollable={this.props.chartRange === 'full'} columns={this.state.dates.length}>
                <Chartist {...chartProps} />
            </ChartContainer>
        );
    },

    /**
     * Render a line chart showing activities on each day
     *
     * @return {ReactElement}
     */
    renderLineChart: function() {
        var chartProps = {
            type: 'line',
            data: {
                labels: this.state.labels,
                series: this.state.series,
            },
            options: {
                fullWidth: true,
                chartPadding: {
                    left: -25,
                    right: 30
                },
                showPoint: false,
                high: this.state.upperRange,
                low: 0,
            },
            onDraw: this.handleChartDraw,
        };
        return (
            <ChartContainer scrollable={this.props.chartRange === 'full'} columns={this.state.dates.length}>
                <Chartist {...chartProps} />
            </ChartContainer>
        );
    },

    /**
     * Render a pie chart showing relative frequencies of activity types
     *
     * @return {ReactElement}
     */
    renderPieChart: function() {
        var chartProps = {
            type: 'pie',
            data: {
                series: _.map(this.state.series, (series) => {
                    var sum = _.sum(series.data);
                    return sum;
                })
            },
            options: {
                labelInterpolationFnc: (label) => {
                    if (label) {
                        return label;
                    }
                }
            },
        };
        return <Chartist {...chartProps} />;
    },

    /**
     * Called when Chartist is drawing a chart
     *
     * @param  {Object} cxt
     */
    handleChartDraw: function(cxt) {
        // move y-axis to the right side
        if(cxt.type === 'label' && cxt.axis.units.pos === 'y') {
            cxt.element.attr({
                x: cxt.axis.chartRect.width() + 5
            });
        } else if (cxt.type === 'grid' && cxt.axis.units.pos === 'x') {
            if (cxt.index === this.state.dates.length - 1) {
                if (this.props.chartType === 'bar') {
                    // add missing grid line
                    var line = new Chartist.Svg('line');
                    line.attr({
                        x1: cxt.x2 + cxt.axis.stepLength,
                        y1: cxt.y1,
                        x2: cxt.x2 + cxt.axis.stepLength,
                        y2: cxt.y2,
                        class: 'ct-grid ct-vertical',
                    });
                    cxt.group.append(line);
                }
            }
            if (this.props.chartRange === 'full') {
                // style grid line differently when it's the first day
                // (when we have a label)
                var label = this.state.labels[cxt.index];
                if (label) {
                    cxt.element.addClass('month-start');
                }
            }
            if (cxt.index === this.state.selectedDateIndex) {
                // add selected date (or today) label
                var x = cxt.x2;
                if (this.props.chartType === 'bar') {
                    x += cxt.axis.stepLength * 0.5;
                }
                var y = cxt.y1 + 12;
                var text = new Chartist.Svg('text');
                text.text(this.state.selectedDateLabel);
                text.attr({
                    x: x,
                    y: y,
                    'text-anchor': 'middle',
                    class: 'date-label',
                });
                cxt.group.append(text);

                var arrow = new Chartist.Svg('text');
                arrow.text('\uf0dd');
                arrow.attr({
                    x: x,
                    y: y + 8,
                    'text-anchor': 'middle',
                    class: 'date-arrow',
                });
                cxt.group.append(arrow);
                cxt.label = 'Hello';
            }
        } else if (cxt.type === 'grid' && cxt.axis.units.pos === 'y') {
            if (cxt.index === cxt.axis.ticks.length - 1) {
                // move label to the front
                var label = cxt.group.querySelector('.date-label');
                var arrow = cxt.group.querySelector('.date-arrow');
                if (label) {
                    cxt.group.append(label);
                }
                if (arrow) {
                    cxt.group.append(arrow);
                }
            }
        } else if (cxt.type === 'bar') {
            // add mouseover title
            var tooltip = _.get(this.state.tooltips, [ cxt.seriesIndex, cxt.index ]);
            var date = this.state.dates[cxt.index];
            var title = new Chartist.Svg('title');
            title.text(tooltip);
            cxt.element.append(title);
            cxt.element.attr({ 'data-date': date });
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
            route.push(require('pages/people-page'), params);
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
            if (value) {
                empty = false;
            }
            return value;
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
        _.each(series, (s) => {
            var values = s.data;
            _.each(values, (value, index) => {
                sums[index] = (sums[index]) ? sums[index] + value : value;
            });
        });
        if (!_.isEmpty(sums)) {
            highest = _.max(sums);
        }
    } else {
        _.each(series, (s) => {
            var values = s.data;
            var max = _.max(values);
            if (max > highest) {
                highest = max;
            }
        });
    }
    // leave some room at the top
    if (highest <= 18) {
        return 20;
    } else if (highest <= 45) {
        return 50;
    } else {
        return Math.ceil(highest / 100) * 100;
    }
});

var getDateLabels = Memoize(function(dates, localeCode) {
    return _.map(dates, (date) => {
        return Moment(date).locale(localeCode).format('l');
    });
});

var getDateOfWeekLabels = Memoize(function(dates, localeCode) {
    return _.map(dates, (date) => {
        return Moment(date).locale(localeCode).format('dd');
    });
});

var getDateOfMonthLabels = Memoize(function(dates, localeCode) {
    return _.map(dates, (date) => {
        var m = Moment(date);
        var d = m.date();
        if (d % 2 === 0) {
            return m.locale(localeCode).format('D');
        } else {
            return '';
        }
    });
});

var getMonthLabels = Memoize(function(dates, localeCode) {
    return _.map(dates, (date) => {
        var m = Moment(date);
        var d = m.date();
        if (d === 1) {
            return m.locale(localeCode).format('MMMM');
        } else {
            return '';
        }
    });
});

function getDateString(m) {
    return m.format('YYYY-MM-DD');
}

var getDates = Memoize(function(start, end) {
    var s = Moment(start);
    var e = Moment(end);
    var dates = [];
    var m = s.clone();
    while (m <= e) {
        var date = getDateString(m);
        dates.push(date);
        m.add(1, 'day');
    }
    return dates;
}, [], false);

var getTwoWeeks = Memoize(function(date, offset) {
    var m = Moment(date).add(offset, 'day');
    var end = getDateString(m);
    var start = getDateString(m.subtract(13, 'day'));
    return getDates(start, end);
}, [], false);

var getMonth = Memoize(function(date) {
    var m = Moment(date).startOf('month');
    var start = getDateString(m);
    var end = getDateString(Moment(date).endOf('month'));
    return getDates(start, end);
}, [], false);

var getMonths = Memoize(function(start, end) {
    start = getDateString(Moment(start).startOf('month'));
    end = getDateString(Moment(end).endOf('month'));
    return getDates(start, end);
}, [], false);

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

function ChartContainer(props) {
    var width = Math.round(props.columns * 0.75) + 'em';
    if (props.scrollable) {
        return (
            <div className="scroll-container-frame">
                <div className="scroll-container">
                    <div className="scroll-container-contents" style={{ width }}>
                        {props.children}
                    </div>
                </div>
            </div>
        );
    } else {
        return props.children;
    }
}
