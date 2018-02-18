var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

// widgets
var HeaderButton = require('widgets/header-button');

require('./chart-toolbar.scss');

module.exports = React.createClass({
    displayName: 'ChartToolbar',
    propTypes: {
        chartType: PropTypes.oneOf([ 'bar', 'line', 'pie' ]),
        locale: PropTypes.instanceOf(Locale).isRequired,
        onAction: PropTypes.func,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var barChartProps = {
            label: t('statistics-bar'),
            icon: 'bar-chart',
            highlighted: (this.props.chartType === 'bar'),
            onClick: this.handleBarChartClick,
        };
        var lineChartProps = {
            label: t('statistics-line'),
            icon: 'line-chart',
            highlighted: (this.props.chartType === 'line'),
            onClick: this.handleLineChartClick,
        };
        var pieChartProps = {
            label: t('statistics-pie'),
            icon: 'pie-chart',
            highlighted: (this.props.chartType === 'pie'),
            onClick: this.handlePieChartClick,
        };
        return (
            <div className="chart-toolbar">
                <HeaderButton {...barChartProps} />
                <HeaderButton {...lineChartProps} />
                <HeaderButton {...pieChartProps} />
            </div>
        );
    },

    /**
     * Inform parent component that certain action should occur
     *
     * @param  {String} action
     * @param  {Object|undefined} props
     */
    triggerActionEvent: function(action, props) {
        if (this.props.onAction) {
            this.props.onAction(_.extend({
                type: 'action',
                target: this,
                action,
            }, props));
        }
    },

    /**
     * Called when user clicks bar chart button
     *
     * @param  {Event} evt
     */
    handleBarChartClick: function(evt) {
        this.triggerActionEvent('chart-type-set', { value: 'bar' });
    },

    /**
     * Called when user clicks bar chart button
     *
     * @param  {Event} evt
     */
    handleLineChartClick: function(evt) {
        this.triggerActionEvent('chart-type-set', { value: 'line' });
    },

    /**
     * Called when user clicks bar chart button
     *
     * @param  {Event} evt
     */
    handlePieChartClick: function(evt) {
        this.triggerActionEvent('chart-type-set', { value: 'pie' });
    },
});
