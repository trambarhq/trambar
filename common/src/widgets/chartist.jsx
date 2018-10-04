import _ from 'lodash';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { Bar, Pie, Line, Interpolation, Svg } from 'chartist';
import ComponentRefs from 'utils/component-refs';

import 'widgets/chartist.scss';

const chartClasses = {
    bar: Bar,
    pie: Pie,
    line: Line
};

class Chartist extends PureComponent {
    static displayName = 'Chartist';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            container: HTMLDivElement
        });
    }

    /**
     * Attach onDraw handler to Chartist instance
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { onDraw } = this.props;
        if (nextProps.onDraw !== onDraw) {
            if (this.chartist) {
                this.chartist.off('draw', onDraw);
                this.chartist.on('draw', nextProps.onDraw);
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { style, className, onClick } = this.props;
        let { setters } = this.components;
        let classNames = [ 'ct-chart' ];
        if (className) {
            classNames.push(className);
        }
        let containerProps = {
            ref: setters.container,
            className: classNames.join(' '),
            style,
            onClick,
        };
        return <div {...containerProps} />
    }

    /**
     * Update chart on prop changes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { type, data, options, responsiveOptions } = this.props;
        if (prevProps.type !== type) {
            this.destroyChart();
            this.createChart();
        } else if (prevProps.data !== data
                || prevProps.options !== options
                || prevProps.responsiveOptions !== responsiveOptions) {
            this.updateChart();
        }
    }

    /**
     * Create chart on mount
     */
    componentDidMount() {
        this.createChart();
    }

    /**
     * Create Chartist instance
     */
    createChart() {
        let { type, data, options, responsiveOptions, onDraw } = this.props;
        let { container } = this.components;
        let ChartClass = chartClasses[type];
        this.chartist = new ChartClass(container, data, options, responsiveOptions);
        if (onDraw) {
            this.chartist.on('draw', onDraw);
        }
    }

    /**
     * Update data series
     */
    updateChart() {
        let { data, options, responsiveOptions } = this.props;
        this.chartist.update(data, options, responsiveOptions);
    }

    /**
     * Destroy Chartist instance
     */
    destroyChart() {
        if (this.chartist) {
            this.chartist.detach();
        }
        let container = this.components.container;
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    }
}

export {
    Chartist as default,
    Chartist,
    Interpolation,
    Svg,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Chartist.propTypes = {
        type: PropTypes.oneOf(['line', 'bar', 'pie']).isRequired,
        data: PropTypes.object.isRequired,
        className: PropTypes.string,
        options: PropTypes.object,
        responsiveOptions: PropTypes.array,
        style: PropTypes.object,
        onDraw: PropTypes.func,
        onClick: PropTypes.func,
    };
}
