var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
var Chartist = require('chartist');

require('chartist/dist/scss/chartist.scss');

module.exports = React.createClass({
    displayName: 'Chartist',
    propTypes: {
        type: PropTypes.oneOf(['line', 'bar', 'pie']).isRequired,
        data: PropTypes.object.isRequired,
        className: PropTypes.string,
        options: PropTypes.object,
        responsiveOptions: PropTypes.array,
        style: PropTypes.object
    },

    render: function() {
        var classNames = [ 'ct-chart' ];
        if (this.props.className) {
            classNames.push(this.props.className);
        }
        var containerProps = {
            ref: 'container',
            className: classNames.join(' '),
            style: this.props.style,
        }
        return <div {...containerProps} />
    },

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

    componentDidMount: function() {
        this.createChart();
    },

    createChart: function() {
        var ChartClass = Chartist[_.upperFirst(this.props.type)];
        var container = this.refs.container;
        this.chartist = new ChartClass(container, this.props.data, this.props.options, this.props.responsiveOptions);
    },

    updateChart: function() {
        this.chartist.update(this.props.data, this.props.options, this.props.responsiveOptions);
    },

    destroyChart: function() {
        if (this.chartist) {
            this.chartist.detach();
        }
        var container = this.refs.container;
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    },
});

module.exports.Interpolation = Chartist.Interpolation;
module.exports.Svg = Chartist.Svg;
