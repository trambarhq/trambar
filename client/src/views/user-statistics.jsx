var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Chartist = require('widgets/chartist');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var UserSection = require('widgets/user-section');
var HeaderButton = require('widgets/header-button');

require('chartist/dist/scss/chartist.scss');

module.exports = React.createClass({
    displayName: 'UserStatistics',
    propTypes: {
        user: PropTypes.object.isRequired,
        statistics: PropTypes.object,

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
        var data = {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            series: [
                [800000, 1200000, 1400000, 1300000],
                [200000, 400000, 500000, 300000],
                [100000, 200000, 400000, 600000]
            ]
        };
        var options = {
            stackBars: true,
            axisY: {
                labelInterpolationFnc: function(value) {
                    return (value / 1000) + 'k';
                }
            }
        };
        return <Chartist data={data} options={options} type="bar" />;
    },

    renderLineChart: function() {
        var data = {
            labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            series: [
                [5, 5, 10, 8, 7, 5, 4, null, null, null, 10, 10, 7, 8, 6, 9],
                [10, 15, null, 12, null, 10, 12, 15, null, null, 12, null, 14, null, null, null],
                [null, null, null, null, 3, 4, 1, 3, 4,  6,  7,  9, 5, null, null, null],
                [{x:3, y: 3},{x: 4, y: 3}, {x: 5, y: undefined}, {x: 6, y: 4}, {x: 7, y: null}, {x: 8, y: 4}, {x: 9, y: 4}]
            ]
        };
        var options = {
            fullWidth: true,
            chartPadding: {
                right: 10
            },
            lineSmooth: Chartist.Interpolation.cardinal({
                fillHoles: true,
            }),
            low: 0
        };
        return <Chartist data={data} options={options} type="line" />;
    },

    renderPieChart: function() {
        var data = {
            series: [5, 3, 4]
        };
        var sum = function(a, b) { return a + b };
        var options = {
            labelInterpolationFnc: function(value) {
                return Math.round(value / data.series.reduce(sum) * 100) + '%';
            }
        };
        return <Chartist data={data} options={options} type="pie" />;
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
});
