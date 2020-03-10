import _ from 'lodash';
import React, { useMemo } from 'react';
import { useListener } from 'relaks';
import Moment from 'moment';
import { memoizeWeak, memoizeStrong } from 'common/utils/memoize.js';
import StoryTypes from 'common/objects/types/story-types.js';

// widgets
import { Chartist, Svg } from 'common/widgets/chartist.jsx';

import './user-statistics.scss';

/**
 * Component for rendering a user's statistics. Used by UserView.
 */
export const UserStatistics = React.memo((props) => {
  const { user, dailyActivities } = props;
  const { route, env, selectedDate, chartType, chartRange } = props;
  const { t, localeCode } = env.locale;
  const activities = dailyActivities?.daily ?? {};
  const range = dailyActivities?.range;
  const date = selectedDate || env.date;
  const dates = useMemo(() => {
    switch (chartRange) {
      case 'biweekly':
        const offset = (selectedDate) ? 6 : 0;
        return getTwoWeeks(date, offset);
      case 'monthly':
        return getMonth(date);
      case 'full':
        if (range) {
          return getMonths(range.start, range.end);
        } else {
          return getMonth(env.date);
        }
    }
  }, [ chartRange, date, range ])
  const labels = useMemo(() => {
    switch (chartRange) {
      case 'biweekly':
        return getDateOfWeekLabels(dates, localeCode);
      case 'monthly':
        return getDateOfMonthLabels(dates, localeCode);
      case 'full':
        return getMonthLabels(dates, localeCode);
    }
  }, [ dates, localeCode ]);
  const series = useMemo(() => {
    return getActivitySeries(activities, dates);
  }, [ dates, activities ]);
  const upperRange = useMemo(() => {
    const additive =  (chartType === 'bar') ? true : false;
    return getUpperRange(series, additive);
  }, [ series, chartType ]);
  const indices = useMemo(() => {
    return getActivityIndices(activities, dates);
  }, [ dates, activities ]);
  const selectedDateIndex = useMemo(() => {
    return _.indexOf(dates, date);
  }, [ dates, date ]);
  const selectedDateLabel = useMemo(() => {
    if (selectedDate) {
      const m = Moment(selectedDate);
      return m.locale(localeCode).format('l');
    } else {
      return t('user-statistics-today');
    }
  }, [ selectedDate, localeCode ]);
  const tooltips = useMemo(() => {
    const dateLabels = getDateLabels(dates, localeCode);
    return _.map(series, (series) => {
      return _.map(series.data, (count, index) => {
        const objects = t(`user-statistics-tooltip-$count-${series.name}`, count);
        const dateLabel = dateLabels[index];
        return `${objects}\n${dateLabel}`;
      });
    });
  }, [ dates, series, localeCode ]);

  const handleChartClick = useListener((evt) => {
    const date = evt.target.getAttribute('data-date');
    if (date) {
      // go to the user's personal page on that date
      route.push('person-page', { selectedUserID: user.id, date });
    }
  });

  return (
    <div className="user-statistics">
      {renderLegend()}
      {renderChart()}
    </div>
  );

  function renderLegend() {
    if (!chartType) {
      return null;
    }
    let items = _.map(indices, renderLegendItem);
    if (_.isEmpty(items)) {
      items = '\u00a0';
    }
    return <div className="legend">{items}</div>;
  }

  function renderLegendItem(index, type) {
    const props = {
      series: String.fromCharCode('a'.charCodeAt(0) + index),
      label: t(`user-statistics-legend-${type}`),
    };
    return <LegendItem key={index} {...props} />;
  }

  function renderChart() {
    switch (chartType) {
      case 'bar': return renderBarChart();
      case 'line': return renderLineChart();
      case 'pie': return renderPieChart();
      default: return null;
    }
  }

  function renderBarChart() {
    const chartProps = {
      type: 'bar',
      data: { labels, series },
      options: {
        stackBars: true,
        chartPadding: {
          left: -25,
          right: 30
        },
        high: upperRange,
        low: 0,
      },
      onDraw: draw,
      onClick: handleChartClick,
    };
    return (
      <ChartContainer scrollable={chartRange === 'full'} columns={dates.length}>
        <Chartist {...chartProps} />
      </ChartContainer>
    );
  }

  function renderLineChart() {
    const chartProps = {
      type: 'line',
      data: { labels, series },
      options: {
        fullWidth: true,
        chartPadding: {
          left: -25,
          right: 30
        },
        showPoint: false,
        high: upperRange,
        low: 0,
      },
      onDraw: draw,
    };
    return (
      <ChartContainer scrollable={chartRange === 'full'} columns={dates.length}>
        <Chartist {...chartProps} />
      </ChartContainer>
    );
  }

  function renderPieChart() {
    const chartProps = {
      type: 'pie',
      data: {
        series: _.map(series, (series) => {
          return _.sum(series.data);
        })
      },
      options: {
        labelInterpolationFnc: (label) => {
          if (label) {
            return label;
          }
        }
      },
    };
    return <Chartist {...chartProps} />;
  }

  function draw(cxt) {
    // move y-axis to the right side
    if(cxt.type === 'label' && cxt.axis.units.pos === 'y') {
      cxt.element.attr({
        x: cxt.axis.chartRect.width() + 5
      });
    } else if (cxt.type === 'grid' && cxt.axis.units.pos === 'x') {
      if (cxt.index === dates.length - 1) {
        if (chartType === 'bar') {
          // add missing grid line
          let line = new Svg('line');
          line.attr({
            x1: cxt.x2 + cxt.axis.stepLength,
            y1: cxt.y1,
            x2: cxt.x2 + cxt.axis.stepLength,
            y2: cxt.y2,
            class: 'ct-grid ct-vertical',
          });
          cxt.group.append(line);
        }
      }
      if (chartRange === 'full') {
        // style grid line differently when it's the first day
        // (when we have a label)
        let label = labels[cxt.index];
        if (label) {
          cxt.element.addClass('month-start');
        }
      }
      if (cxt.index === selectedDateIndex) {
        // add selected date (or today) label
        let x = cxt.x2;
        if (chartType === 'bar') {
          x += cxt.axis.stepLength * 0.5;
        }
        let y = cxt.y1 + 12;
        let text = new Svg('text');
        text.text(selectedDateLabel);
        text.attr({
          x: x,
          y: y,
          'text-anchor': 'middle',
          class: 'date-label',
        });
        cxt.group.append(text);

        let arrow = new Svg('text');
        arrow.text('\uf0d7');
        arrow.attr({
          x: x,
          y: y + 8,
          'text-anchor': 'middle',
          class: 'date-arrow fas fa-caret-down',
        });
        cxt.group.append(arrow);
        cxt.label = 'Hello';
      }
    } else if (cxt.type === 'grid' && cxt.axis.units.pos === 'y') {
      if (cxt.index === cxt.axis.ticks.length - 1) {
        // move label to the front
        let label = cxt.group.querySelector('.date-label');
        let arrow = cxt.group.querySelector('.date-arrow');
        if (label) {
          cxt.group.append(label);
        }
        if (arrow) {
          cxt.group.append(arrow);
        }
      }
    } else if (cxt.type === 'bar') {
      // add mouseover title
      const tooltip = tooltips?.[cxt.seriesIndex]?.[cxt.index];
      const date = dates[cxt.index];
      const title = new Svg('title');
      title.text(tooltip);
      cxt.element.append(title);
      cxt.element.attr({ 'data-date': date });
    }
  }
});

const getActivityIndices = memoizeWeak(null, function(activities, dates) {
  const present = {};
  for (let date of dates) {
    const counts = activities[date];
    for (let [ type, count ] of _.entries(counts)) {
      if (count) {
        present[type] = true;
      }
    }
  }
  const indices = {};
  for (let [ index, type ] of StoryTypes.entries()) {
    if (present[type]) {
      indices[type] = index;
    }
  }
  return indices;
});

const getActivitySeries = memoizeWeak(null, function(activities, dates) {
  return _.map(StoryTypes, (type) => {
    // don't include series that are completely empty
    let empty = true;
    let series = _.map(dates, (date) => {
      let value = activities?.[date]?.[type] ?? 0;
      if (value) {
        empty = false;
      }
      return value;
    });
    if (empty) {
      series = [];
    }
    return {
      name: type,
      data: series,
    };
  });
});

const getUpperRange = memoizeWeak(null, function(series, additive) {
  let highest = 0;
  if (additive) {
    const sums = [];
    for (let { data } of series) {
      for (let [ index, value ] of data.entries()) {
        sums[index] = (sums[index]) ? sums[index] + value : value;
      }
    }
    if (!_.isEmpty(sums)) {
      highest = _.max(sums);
    }
  } else {
    for (let { data } of series) {
      const max = _.max(data);
      if (max > highest) {
        highest = max;
      }
    }
  }
  // leave some room at the top
  if (highest < 100) {
    let upper = Math.ceil(highest / 10) * 10;
    while ((highest / upper) > 0.85) {
      upper += 10;
    }
    if (upper < 20) {
      upper = 20;
    }
    return upper;
  } else {
    let upper = Math.ceil(highest / 100) * 100;
    while ((highest / upper) > 0.85) {
      upper += 100;
    }
    return upper;
  }
});

const getDateLabels = memoizeWeak(null, function(dates, localeCode) {
  return _.map(dates, (date) => {
    return Moment(date).locale(localeCode).format('l');
  });
});

const getDateOfWeekLabels = memoizeWeak(null, function(dates, localeCode) {
  return _.map(dates, (date) => {
    return Moment(date).locale(localeCode).format('dd');
  });
});

const getDateOfMonthLabels = memoizeWeak(null, function(dates, localeCode) {
  return _.map(dates, (date) => {
    const m = Moment(date);
    const d = m.date();
    if (d % 2 === 0) {
      return m.locale(localeCode).format('D');
    } else {
      return '';
    }
  });
});

const getMonthLabels = memoizeWeak(null, function(dates, localeCode) {
  return _.map(dates, (date) => {
    const m = Moment(date);
    const d = m.date();
    if (d === 1) {
      return m.locale(localeCode).format('MMMM');
    } else {
      return '';
    }
  });
});

function getDateString(m) {
  return m.format('YYYY-MM-DD');
}

const getDates = memoizeStrong([], function(start, end) {
  const s = Moment(start);
  const e = Moment(end);
  const dates = [];
  const m = s.clone();
  while (m <= e) {
    const date = getDateString(m);
    dates.push(date);
    m.add(1, 'day');
  }
  return dates;
});

const getTwoWeeks = memoizeStrong([], function(date, offset) {
  const m = Moment(date).add(offset, 'day');
  const end = getDateString(m);
  const start = getDateString(m.subtract(13, 'day'));
  return getDates(start, end);
});

const getMonth = memoizeStrong([], function(date) {
  const m = Moment(date).startOf('month');
  const start = getDateString(m);
  const end = getDateString(Moment(date).endOf('month'));
  return getDates(start, end);
});

const getMonths = memoizeStrong([], function(start, end) {
  start = getDateString(Moment(start).startOf('month'));
  end = getDateString(Moment(end).endOf('month'));
  return getDates(start, end);
});

function LegendItem(props) {
  const { series, label } = props;
  return (
    <div className="item">
      <svg className="ct-chart-bar" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
        <g className={`ct-series ct-series-${series}`}>
          <line className="ct-bar" x1={0} y1={5} x2={10} y2={5} />
        </g>
      </svg>
      <span className="label">
        {label}
      </span>
    </div>
  )
}

function ChartContainer(props) {
  const { columns, scrollable, children } = props;
  const width = Math.round(columns * 0.75) + 'em';
  if (scrollable) {
    return (
      <div className="scroll-container-frame">
        <div className="scroll-container">
          <div className="scroll-container-contents" style={{ width }}>
            {children}
          </div>
        </div>
      </div>
    );
  } else {
    return children;
  }
}

UserStatistics.defaultProps = {
  chartRange: 'biweekly'
};
