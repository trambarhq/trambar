import React from 'react';
import { useListener } from 'relaks';

// widgets
import { HeaderButton } from './header-button.jsx';

import './chart-toolbar.scss';

/**
 * Toolbar with buttons for changing the chart type.
 */
export function ChartToolbar(props) {
  const { env, chartType, onAction } = props;
  const { t } = env.locale;

  const handleClick = useListener((evt) => {
    const value = evt.currentTarget.getAttribute('data-type');
    const action = 'chart-type-set';
    if (onAction) {
      onAction({ action, value });
    }
  });

  const barChartProps = {
    label: t('statistics-bar'),
    icon: 'bar-chart',
    highlighted: (chartType === 'bar'),
    'data-type': 'bar',
    onClick: handleClick,
  };
  const lineChartProps = {
    label: t('statistics-line'),
    icon: 'line-chart',
    highlighted: (chartType === 'line'),
    'data-type': 'line',
    onClick: handleClick,
  };
  const pieChartProps = {
    label: t('statistics-pie'),
    icon: 'pie-chart',
    highlighted: (chartType === 'pie'),
    'data-type': 'pie',
    onClick: handleClick,
  };
  return (
    <div className="chart-toolbar">
      <HeaderButton {...barChartProps} />
      <HeaderButton {...lineChartProps} />
      <HeaderButton {...pieChartProps} />
    </div>
  );
}
