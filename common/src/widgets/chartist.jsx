import _ from 'lodash';
import React, { useState, useRef, useEffect } from 'react';
import { Bar, Pie, Line } from 'chartist';

import 'context/widgets/chartist.scss';

const chartClasses = {
  bar: Bar,
  pie: Pie,
  line: Line
};

export function Chartist(props) {
  const { type, data, options, responsiveOptions, style, className } = props;
  const { onClick, onDraw } = props;
  const containerRef = useRef();
  const [ state ] = useState({});

  useEffect(() => {
    const container = containerRef.current;
    const ChartClass = chartClasses[type];
    const chartist = new ChartClass(container, data, options, responsiveOptions);
    state.chartist = chartist;
    state.fresh = true;
    return () => {
      chartist.detach();
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [ type ]);
  useEffect(() => {
    // update only if the function above hasn't been called
    const { chartist, fresh } = state;
    if (!fresh) {
      chartist.update(data, options, responsiveOptions);
    } else {
      state.fresh = false;
    }
  }, [ type, data, options, responsiveOptions ]);
  useEffect(() => {
    const { chartist } = state;
    if (onDraw) {
      chartist.on('draw', onDraw);
      return () => {
        chartist.off('draw', onDraw)
      };
    }
  }, [ state.chartist, onDraw ]);

  const classNames = [ 'ct-chart' ];
  if (className) {
    classNames.push(className);
  }
  const containerProps = {
    className: classNames.join(' '),
    style,
    onClick,
  };
  return <div ref={containerRef} {...containerProps} />
}

export { Interpolation, Svg } from 'chartist';
