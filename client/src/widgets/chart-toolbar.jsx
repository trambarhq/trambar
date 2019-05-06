import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import HeaderButton from './header-button.jsx';

import './chart-toolbar.scss';

/**
 * Toolbar with buttons for changing the chart type.
 *
 * @extends PureComponent
 */
class ChartToolbar extends PureComponent {
    static displayName = 'ChartToolbar';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env, chartType } = this.props;
        let { t } = env.locale;
        let barChartProps = {
            label: t('statistics-bar'),
            icon: 'bar-chart',
            highlighted: (chartType === 'bar'),
            onClick: this.handleBarChartClick,
        };
        let lineChartProps = {
            label: t('statistics-line'),
            icon: 'line-chart',
            highlighted: (chartType === 'line'),
            onClick: this.handleLineChartClick,
        };
        let pieChartProps = {
            label: t('statistics-pie'),
            icon: 'pie-chart',
            highlighted: (chartType === 'pie'),
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
        let { onAction } = this.props;
        if (onAction) {
            onAction(_.extend({
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

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ChartToolbar.propTypes = {
        chartType: PropTypes.oneOf([ 'bar', 'line', 'pie' ]),
        env: PropTypes.instanceOf(Environment).isRequired,
        onAction: PropTypes.func,
    };
}
