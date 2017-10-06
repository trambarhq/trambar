var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Chartist = require('widgets/chartist');
var Moment = require('moment');
var DateTracker = require('utils/date-tracker');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var UserSection = require('widgets/user-section');
var HeaderButton = require('widgets/header-button');

require('./user-statistics.scss');

module.exports = React.createClass({
    displayName: 'UserStatistics',
    propTypes: {
        user: PropTypes.object.isRequired,
        dailyActivities: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        // use state from previous instance (unmounted due to on-demand rendering)
        var previousState = previousStates[this.props.user.id];
        if (previousState) {
            return previousState;
        }
        return {
            chartType: 'bar',
            showingContents: false,
        };
    },

    /**
     * Return true if contents isn't collapsed
     *
     * @return {Boolean}
     */
    isShowingContents: function() {
        if (!this.state.showingContents) {
            if (this.props.theme.mode === 'columns-1') {
                return false;
            }
        }
        return true;
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <UserSection className="statistics">
                <header>
                    {this.renderButtons()}
                </header>
                <body>
                    {this.renderLegend()}
                    {this.renderChart()}
                </body>
            </UserSection>
        );
    },

    /**
     * Render header buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var showingContents = this.isShowingContents();
        var barChartProps = {
            label: t('statistics-bar'),
            icon: 'bar-chart',
            highlighted: (showingContents && this.state.chartType === 'bar'),
            onClick: this.handleBarChartClick,
        };
        var lineChartProps = {
            label: t('statistics-line'),
            icon: 'line-chart',
            highlighted: (showingContents && this.state.chartType === 'line'),
            onClick: this.handleLineChartClick,
        };
        var pieChartProps = {
            label: t('statistics-pie'),
            icon: 'pie-chart',
            highlighted: (showingContents && this.state.chartType === 'pie'),
            onClick: this.handlePieChartClick,
        };
        return (
            <div>
                <HeaderButton {...barChartProps} />
                <HeaderButton {...lineChartProps} />
                <HeaderButton {...pieChartProps} />
            </div>
        );
    },

    /**
     * Render legend for data series
     *
     * @return {ReactElement}
     */
    renderLegend: function() {
        if (!this.isShowingContents()) {
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
                key: index,
            };
            return <LegendItem {...props} />;
        });
        if (_.isEmpty(items)) {
            items = '\u00a0';
        }
        return <div className="legend">{items}</div>;
    },

    /**
     * Render currently selected chart type
     *
     * @return {ReactElement}
     */
    renderChart: function() {
        if (!this.isShowingContents()) {
            return null;
        }
        switch (this.state.chartType) {
            case 'bar': return this.renderBarChart();
            case 'line': return this.renderLineChart();
            case 'pie': return this.renderPieChart();
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

    /**
     * Listen for date change over
     */
    componentDidMount: function() {
        DateTracker.addEventListener('change', this.handleDateChange);
    },

    /**
     * Remove event listener and save state
     */
    componentWillUnmount: function() {
        DateTracker.removeEventListener('change', this.handleDateChange);
        previousStates[this.props.user.id] = this.state;
    },

    /**
     * Called when user click bar chart button
     *
     * @param  {Event} evt
     */
    handleBarChartClick: function(evt) {
        this.setState({ chartType: 'bar', showingContents: true });
    },

    /**
     * Called when user click line chart button
     *
     * @param  {Event} evt
     */
    handleLineChartClick: function(evt) {
        this.setState({ chartType: 'line', showingContents: true });
    },

    /**
     * Called when user click pie chart button
     *
     * @param  {Event} evt
     */
    handlePieChartClick: function(evt) {
        this.setState({ chartType: 'pie', showingContents: true });
    },

    /**
     * Called at midnight local time
     *
     * @param  {Object} evt
     */
    handleDateChange: function(evt) {
        // TODO: this should happen at the list level, since we need new data
        this.forceUpdate();
    },
});

var previousStates = {};

var getDates = function(today, count) {
    var m = Moment(today);
    var dates = _.times(count, () => {
        var date = m.format('YYYY-MM-DD');
        m.subtract(1, 'day');
        return date;
    });
    return _.reverse(dates);
}

var storyTypes = [
    'push',
    'merge',
    'issue',
    'wiki',
    'milestone',
    'story',
    'survey',
    'task-list',
];

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
    _.each(storyTypes, (type, index) => {
        if (present[type]) {
            indices[type] = index;
        }
    });
    return indices;
});

var getActivitySeries = Memoize(function(activities, dates) {
    return _.map(storyTypes, (type) => {
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
