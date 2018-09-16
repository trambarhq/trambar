import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import HeaderButton from 'widgets/header-button';

import './chart-toolbar.scss';

class ChartToolbar extends PureComponent {
    static displayName = 'ChartToolbar';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let t = this.props.locale.translate;
        let barChartProps = {
            label: t('statistics-bar'),
            icon: 'bar-chart',
            highlighted: (this.props.chartType === 'bar'),
            onClick: this.handleBarChartClick,
        };
        let lineChartProps = {
            label: t('statistics-line'),
            icon: 'line-chart',
            highlighted: (this.props.chartType === 'line'),
            onClick: this.handleLineChartClick,
        };
        let pieChartProps = {
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
    }

    /**
     * Inform parent component that certain action should occur
     *
     * @param  {String} action
     * @param  {Object|undefined} props
     */
    triggerActionEvent(action, props) {
        if (this.props.onAction) {
            this.props.onAction(_.extend({
                type: 'action',
                target: this,
                action,
            }, props));
        }
    }

    /**
     * Called when user clicks bar chart button
     *
     * @param  {Event} evt
     */
    handleBarChartClick = (evt) => {
        this.triggerActionEvent('chart-type-set', { value: 'bar' });
    }

    /**
     * Called when user clicks bar chart button
     *
     * @param  {Event} evt
     */
    handleLineChartClick = (evt) => {
        this.triggerActionEvent('chart-type-set', { value: 'line' });
    }

    /**
     * Called when user clicks bar chart button
     *
     * @param  {Event} evt
     */
    handlePieChartClick = (evt) => {
        this.triggerActionEvent('chart-type-set', { value: 'pie' });
    }
}

export {
    ChartToolbar as default,
    ChartToolbar,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ChartToolbar.propTypes = {
        chartType: PropTypes.oneOf([ 'bar', 'line', 'pie' ]),
        env: PropTypes.instanceOf(Environment).isRequired,
        onAction: PropTypes.func,
    };
}
