import _ from 'lodash';
import React from 'react';
import Moment from 'moment';
import { memoizeWeak } from 'common/utils/memoize.js';
import { StoryTypes } from 'common/objects/types/story-types.js';

// widgets
import { Chartist } from 'common/widgets/chartist.jsx';

import './activity-chart.scss';

/**
 * Bar chart showing daily activities.
 */
export const ActivityChart = React.memo((props) => {
  const { env, statistics, children } = props;
  const { t } = env.locale;

  return (
    <div className="activity-chart">
      <h2>{children}</h2>
      {renderLegend()}
      {renderChart()}
    </div>
  );

  function renderChart() {
    if (!statistics) {
      return (
        <div className="scroll-container">
          <div className="contents no-data" />
        </div>
      );
    }
    const today = Moment(env.date);
    const rangeStart = Moment(statistics.range.start);
    const rangeEnd = Moment(statistics.range.end);

    const endOfThisMonth = today.clone().endOf('month');
    let startDate = rangeStart.clone().startOf('month');
    let endDate = rangeEnd.clone().endOf('month');

    if (endOfThisMonth.diff(endDate, 'month') <= 1) {
      // use the current month when there were activities in this or
      // the previous month
      endDate = endOfThisMonth;
    } else {
      // otherwise add one month of no activities
      endDate.add(1, 'month');
    }

    const dates = getDateStrings(startDate, endDate);
    const series = getActivitySeries(statistics.daily, dates);
    const upperRange = getUpperRange(series, true);
    const labels = getDateStrings(startDate, endDate);
    const chartProps = {
      type: 'bar',
      data: { labels, series },
      options: {
        fullWidth: true,
        height: 200,
        chartPadding: {
          left: -25,
          right: 30
        },
        stackBars: true,
        high: upperRange,
        low: 0,
        axisX: {
          labelInterpolationFnc(date) {
            const day = getDay(date);
            if (day === 1) {
              return date;
            } else if (day > 10 && date == env.date){
              return 'Today';
            }
            return '';
          }
        },
      },
      onDraw: draw,
    };
    const width = Math.round(labels.length * 0.75) + 'em';
    return (
      <div className="scroll-container">
        <div className="contents" style={{ width }}>
          <Chartist {...chartProps} />
        </div>
      </div>
    );
  }

  function renderLegend() {
    if (!statistics) {
      return null;
    }
    const stats = statistics.to_date;
    const indices = {};
    _.each(StoryTypes, (type, index) => {
      if (stats[type] > 0) {
        indices[type] = index;
      }
    });
    const items = _.map(indices, (index, type) => {
      const props = {
        series: String.fromCharCode('a'.charCodeAt(0) + index),
        label: t(`activity-chart-legend-${type}`),
      };
      return <LegendItem key={index} {...props} />;
    });
    if (_.isEmpty(items)) {
      items.push('\u00a0');
    }
    return <div className="legend">{items}</div>;
  }

  function draw(cxt) {
    // move y-axis to the right side
    if(cxt.type === 'label' && cxt.axis.units.pos === 'y') {
      cxt.element.attr({
        x: cxt.axis.chartRect.width() + 20
      });
    }
    // style grid line differently when it's the first day
    // of the month or today
    if (cxt.type === 'grid' && cxt.axis.units.pos === 'x') {
      const date = cxt.axis.ticks[cxt.index];
      const day = getDay(date);
      if (day === 1) {
        cxt.element.addClass('month-start');
      } else if (date === env.date) {
        cxt.element.addClass('today');
      }
    }
  }
});

export function LegendItem(props) {
  return (
    <div className="item">
      <svg className="ct-chart-bar" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
        <g className={`ct-series ct-series-${props.series}`}>
          <line className="ct-bar" x1={0} y1={5} x2={10} y2={5} />
        </g>
      </svg>
      <span className="label">
        {props.label}
      </span>
    </div>
  )
}

const getDateStrings = memoizeWeak(null, function(startDate, endDate) {
  const dates = [];
  for (let d = startDate.clone(); d <= endDate; d.add(1, 'day')) {
    dates.push(d.format('YYYY-MM-DD'));
  }
  return dates;
});

const getDateLabels = memoizeWeak(null, function(startDate, endDate) {
  const labels = [];
  for (let d = startDate.clone(); d <= endDate; d.add(1, 'month')) {
    labels.push(d.format('ll'));

    const days = d.daysInMonth();
    for (let i = 1; i < days; i++) {
      labels.push(null);
    }
  }
  return labels;
});

const getActivitySeries = memoizeWeak(null, function(activities, dates) {
  return _.map(StoryTypes, (type) => {
    // don't include series that are completely empty
    let empty = true;
    const series = _.map(dates, (date) => {
      const value = activities?.[date]?.[type] ?? 0;
      if (value) {
        empty = false;
      }
      return value;
    });
    return (empty) ? [] : series;
  });
});

const getUpperRange = memoizeWeak(0, function(series, additive) {
  let highest = 0;
  if (additive) {
    const sums = [];
    _.each(series, (values) => {
      _.each(values, (value, index) => {
        sums[index] = (sums[index]) ? sums[index] + value : value;
      });
    });
    if (!_.isEmpty(sums)) {
      highest = _.max(sums);
    }
  } else {
    _.each(series, (values) => {
      const max = _.max(values);
      if (max > highest) {
        highest = max;
      }
    });
  }
  if (highest <= 20) {
    return 20;
  } else if (highest <= 50) {
    return 50;
  } else {
    return Math.ceil(highest / 100) * 100;
  }
});

function getDay(date) {
  return parseInt(date.substr(8));
}
