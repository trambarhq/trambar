var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var UserSection = require('widgets/user-section');
var HeaderButton = require('widgets/header-button');

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
