var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Chartist = require('widgets/chartist');
var Moment = require('moment');
var DateTracker = require('utils/date-tracker');

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
            chartType: 'bar'
        };
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
        var barChartProps = {
            label: t('statistics-bar'),
            icon: 'bar-chart',
            highlighted: (this.state.chartType === 'bar'),
            onClick: this.handleBarChartClick,
        };
        var lineChartProps = {
            label: t('statistics-line'),
            icon: 'line-chart',
            highlighted: (this.state.chartType === 'line'),
            onClick: this.handleLineChartClick,
        };
        var pieChartProps = {
            label: t('statistics-pie'),
            icon: 'pie-chart',
            highlighted: (this.state.chartType === 'pie'),
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

    renderChart: function() {
        switch (this.state.chartType) {
            case 'bar': return this.renderBarChart();
            case 'line': return this.renderLineChart();
            case 'pie': return this.renderPieChart();
        }
    },

    renderBarChart: function() {
        var details = _.get(this.props.dailyActivities, 'details', {});
        var dates = getDates(DateTracker.today, 14);
        var types = getActivityTypes(details);
        var series = getActivitySeries(details, dates);
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
                high: 20,
                low: 0,
            }
        };
        return <Chartist {...chartProps} />;
    },

    renderLineChart: function() {
        var details = _.get(this.props.dailyActivities, 'details', {});
        var dates = getDates(DateTracker.today, 14);
        var types = getActivityTypes(details);
        var series = getActivitySeries(details, dates);
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
                high: 20,
                low: 0,
            }
        };
        return <Chartist {...chartProps} />;
    },

    renderPieChart: function() {
        var details = _.get(this.props.dailyActivities, 'details', {});
        var dates = getDates(DateTracker.today, 14);
        var types = getActivityTypes(details);
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

    componentDidMount: function() {
        DateTracker.addEventListener('change', this.handleDateChange);
    },

    componentWillUnmount: function() {
        DateTracker.removeEventListener('change', this.handleDateChange);
        previousStates[this.props.user.id] = this.state;
    },

    handleBarChartClick: function(evt) {
        this.setState({ chartType: 'bar' });
    },

    handleLineChartClick: function(evt) {
        this.setState({ chartType: 'line' });
    },

    handlePieChartClick: function(evt) {
        this.setState({ chartType: 'pie' });
    },

    /**
     * Redraw the component when a date change-over occurs
     *
     * @param  {Object} evt
     */
    handleDateChange: function(evt) {
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
    'commit',
    'story',
    'survey',
    'task-list',
];

var getActivityTypes = function(activities) {
    var types = [];
    _.forIn(activities, (counts, date) => {
        var typesOnDate = _.keys(counts);
        types = _.union(types, typesOnDate);
    });
    return _.intersection(storyTypes, types);
};

var getActivitySeries = function(activities, dates) {
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
};

var getDateLabel = function(dates, languageCode) {
    return _.map(dates, (date) => {
        return Moment(date).format('dd');
    });
};
