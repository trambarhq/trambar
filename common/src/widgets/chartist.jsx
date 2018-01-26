var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
var Chartist = require('chartist');
var ComponentRefs = require('utils/component-refs');

require('widgets/chartist.scss');

module.exports = React.createClass({
    displayName: 'Chartist',
    propTypes: {
        type: PropTypes.oneOf(['line', 'bar', 'pie']).isRequired,
        data: PropTypes.object.isRequired,
        className: PropTypes.string,
        options: PropTypes.object,
        responsiveOptions: PropTypes.array,
        style: PropTypes.object,
        onDraw: PropTypes.func,
        onClick: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            container: HTMLDivElement
        });
        return {};
    },

    /**
     * Attach onDraw handler to Chartist instance
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.onDraw !== nextProps.onDraw) {
            if (this.chartist) {
                this.chartist.off('draw', this.props.onDraw);
            } else {
                this.chartist.on('draw', nextProps.onDraw);
            }
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var classNames = [ 'ct-chart' ];
        if (this.props.className) {
            classNames.push(this.props.className);
        }
        var containerProps = {
            ref: this.components.setters.container,
            className: classNames.join(' '),
            style: this.props.style,
            onClick: this.props.onClick,
        };
        return <div {...containerProps} />
    },

    /**
     * Update chart on prop changes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (prevProps.type !== this.props.type) {
            this.destroyChart();
            this.createChart();
        } else if (prevProps.data !== this.props.data
                || prevProps.options !== this.props.options
                || prevProps.responsiveOptions !== this.props.responsiveOptions) {
            this.updateChart();
        }
    },

    /**
     * Create chart on mount
     */
    componentDidMount: function() {
        this.createChart();
    },

    /**
     * Create Chartist instance
     */
    createChart: function() {
        var ChartClass = Chartist[_.upperFirst(this.props.type)];
        var container = this.components.container;
        this.chartist = new ChartClass(container, this.props.data, this.props.options, this.props.responsiveOptions);
        if (this.props.onDraw) {
            this.chartist.on('draw', this.props.onDraw);
        }
    },

    /**
     * Update data series
     */
    updateChart: function() {
        this.chartist.update(this.props.data, this.props.options, this.props.responsiveOptions);
    },

    /**
     * Destroy Chartist instance
     */
    destroyChart: function() {
        if (this.chartist) {
            this.chartist.detach();
        }
        var container = this.components.container;
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    },
});

module.exports.Interpolation = Chartist.Interpolation;
module.exports.Svg = Chartist.Svg;
