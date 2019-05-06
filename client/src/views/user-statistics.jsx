import _ from 'lodash';
import React, { PureComponent } from 'react';
import Chartist, { Svg } from 'common/widgets/chartist.jsx';
import Moment from 'moment';
import { memoizeWeak, memoizeStrong } from 'common/utils/memoize.mjs';
import StoryTypes from 'common/objects/types/story-types.mjs';

import './user-statistics.scss';

/**
 * Component for rendering a user's statistics. Used by UserView.
 *
 * @extends PureComponent
 */
class UserStatistics extends PureComponent {
    static displayName = 'UserStatistics';

    constructor(props) {
        super(props);
        this.state = {
            dates: [],
            labels: [],
            series: [],
            indices: [],
            upperRange: 0,
            selectedDateIndex: -1,
        };
        this.updateSeries(this.state, props);
    }

    /**
     * Update data and labels on props change
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { env } = this.props;
        let diff = _.shallowDiff(nextProps, this.props);
        let needUpdate = false;
        if (diff.chartRange || diff.dailyActivities || diff.selectedDate) {
            needUpdate = true;
        } else if (diff.env) {
            if (env.date !== nextProps.env.date) {
                needUpdate = true;
            }
        }
        if (needUpdate) {
            let nextState = _.clone(this.state);
            this.updateSeries(nextState, nextProps);
            this.setState(nextState);
        }
    }

    /**
     * Update data and labels
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateSeries(nextState, nextProps) {
        let { env, selectedDate, dailyActivities, chartType, chartRange } = nextProps;
        let { t, localeCode } = env.locale;
        let date = selectedDate || env.date;
        let activities = _.get(dailyActivities, 'daily', {});
        switch (chartRange) {
            case 'biweekly':
                let offset = (selectedDate) ? 6 : 0;
                nextState.dates = getTwoWeeks(date, offset);
                nextState.labels = getDateOfWeekLabels(nextState.dates, localeCode);
                break;
            case 'monthly':
                nextState.dates = getMonth(date);
                nextState.labels = getDateOfMonthLabels(nextState.dates, localeCode);
                break;
            case 'full':
                let range = _.get(dailyActivities, 'range');
                if (range) {
                    nextState.dates = getMonths(range.start, range.end);
                } else {
                    nextState.dates = getMonth(env.date);
                }
                nextState.labels = getMonthLabels(nextState.dates, localeCode);
                break;
        }
        let additive =  (chartType === 'bar') ? true : false;
        nextState.series = getActivitySeries(activities, nextState.dates);
        nextState.upperRange = getUpperRange(nextState.series, additive);
        nextState.indices = getActivityIndices(activities, nextState.dates);
        nextState.selectedDateIndex = _.indexOf(nextState.dates, date);
        if (selectedDate) {
            let m = Moment(selectedDate);
            nextState.selectedDateLabel = m.locale(localeCode).format('l');
        } else {
            nextState.selectedDateLabel = t('user-statistics-today');
        }
        let dateLabels = getDateLabels(nextState.dates, localeCode);
        nextState.tooltips = _.map(nextState.series, (series) => {
            return _.map(series.data, (count, index) => {
                let objects = t(`user-statistics-tooltip-$count-${series.name}`, count);
                let dateLabel = dateLabels[index];
                return `${objects}\n${dateLabel}`;
            });
        });
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <div className="user-statistics">
                {this.renderLegend()}
                {this.renderChart()}
            </div>
        );
    }

    /**
     * Render legend for data series
     *
     * @return {ReactElement|null}
     */
    renderLegend() {
        let { env, chartType } = this.props;
        let { indices } = this.state;
        let { t } = env.locale;
        if (!chartType) {
            return null;
        }
        let items = _.map(indices, (index, type) => {
            let props = {
                series: String.fromCharCode('a'.charCodeAt(0) + index),
                label: t(`user-statistics-legend-${type}`),
            };
            return <LegendItem key={index} {...props} />;
        });
        if (_.isEmpty(items)) {
            items = '\u00a0';
        }
        return <div className="legend">{items}</div>;
    }

    /**
     * Render currently selected chart type
     *
     * @return {ReactElement|null}
     */
    renderChart() {
        let { chartType } = this.props;
        switch (chartType) {
            case 'bar': return this.renderBarChart();
            case 'line': return this.renderLineChart();
            case 'pie': return this.renderPieChart();
            default: return null;
        }
    }

    /**
     * Render a stacked bar chart showing activities on each day
     *
     * @return {ReactElement}
     */
    renderBarChart() {
        let { chartRange } = this.props;
        let { labels, series, dates, upperRange } = this.state;
        let chartProps = {
            type: 'bar',
            data: { labels, series, },
            options: {
                stackBars: true,
                chartPadding: {
                    left: -25,
                    right: 30
                },
                high: upperRange,
                low: 0,
            },
            onDraw: this.handleChartDraw,
            onClick: this.handleChartClick,
        };
        return (
            <ChartContainer scrollable={chartRange === 'full'} columns={dates.length}>
                <Chartist {...chartProps} />
            </ChartContainer>
        );
    }

    /**
     * Render a line chart showing activities on each day
     *
     * @return {ReactElement}
     */
    renderLineChart() {
        let { chartRange } = this.props;
        let { labels, series, dates, upperRange } = this.state;
        let chartProps = {
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
            onDraw: this.handleChartDraw,
        };
        return (
            <ChartContainer scrollable={chartRange === 'full'} columns={dates.length}>
                <Chartist {...chartProps} />
            </ChartContainer>
        );
    }

    /**
     * Render a pie chart showing relative frequencies of activity types
     *
     * @return {ReactElement}
     */
    renderPieChart() {
        let { series } = this.state;
        let chartProps = {
            type: 'pie',
            data: {
                series: _.map(series, (series) => {
                    let sum = _.sum(series.data);
                    return sum;
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

    /**
     * Called when Chartist is drawing a chart
     *
     * @param  {Object} cxt
     */
    handleChartDraw = (cxt) => {
        let { chartType, chartRange } = this.props;
        let {
            labels,
            dates,
            selectedDateIndex,
            selectedDateLabel,
            tooltips
        } = this.state;
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
                arrow.text('\uf0dd');
                arrow.attr({
                    x: x,
                    y: y + 8,
                    'text-anchor': 'middle',
                    class: 'date-arrow',
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
            let tooltip = _.get(tooltips, [ cxt.seriesIndex, cxt.index ]);
            let date = dates[cxt.index];
            let title = new Svg('title');
            title.text(tooltip);
            cxt.element.append(title);
            cxt.element.attr({ 'data-date': date });
        }
    }

    /**
     * Called when user clicks on the chart
     *
     * @param  {Event} evt
     */
    handleChartClick = (evt) => {
        let { route, user } = this.props;
        let date = evt.target.getAttribute('data-date');
        if (date) {
            // go to the user's personal page on that date
            route.push('person-page', { selectedUserID: user.id, date });
        }
    }
}

const getActivityIndices = memoizeWeak(null, function(activities, dates) {
    let present = {};
    _.each(dates, (date) => {
        let counts = activities[date];
        _.forIn(counts, (count, type) => {
            if (count) {
                present[type] = true;
            }
        });
    });
    let indices = {};
    _.each(StoryTypes, (type, index) => {
        if (present[type]) {
            indices[type] = index;
        }
    });
    return indices;
});

const getActivitySeries = memoizeWeak(null, function(activities, dates) {
    return _.map(StoryTypes, (type) => {
        // don't include series that are completely empty
        let empty = true;
        let series = _.map(dates, (date) => {
            let value = _.get(activities, [ date, type ], 0);
            if (value) {
                empty = false;
            }
            return value;
        });
        if (empty) {
            return [];
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
        let sums = [];
        _.each(series, (s) => {
            let values = s.data;
            _.each(values, (value, index) => {
                sums[index] = (sums[index]) ? sums[index] + value : value;
            });
        });
        if (!_.isEmpty(sums)) {
            highest = _.max(sums);
        }
    } else {
        _.each(series, (s) => {
            let values = s.data;
            let max = _.max(values);
            if (max > highest) {
                highest = max;
            }
        });
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
        let m = Moment(date);
        let d = m.date();
        if (d % 2 === 0) {
            return m.locale(localeCode).format('D');
        } else {
            return '';
        }
    });
});

const getMonthLabels = memoizeWeak(null, function(dates, localeCode) {
    return _.map(dates, (date) => {
        let m = Moment(date);
        let d = m.date();
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
    let s = Moment(start);
    let e = Moment(end);
    let dates = [];
    let m = s.clone();
    while (m <= e) {
        let date = getDateString(m);
        dates.push(date);
        m.add(1, 'day');
    }
    return dates;
});

const getTwoWeeks = memoizeStrong([], function(date, offset) {
    let m = Moment(date).add(offset, 'day');
    let end = getDateString(m);
    let start = getDateString(m.subtract(13, 'day'));
    return getDates(start, end);
});

const getMonth = memoizeStrong([], function(date) {
    let m = Moment(date).startOf('month');
    let start = getDateString(m);
    let end = getDateString(Moment(date).endOf('month'));
    return getDates(start, end);
});

const getMonths = memoizeStrong([], function(start, end) {
    start = getDateString(Moment(start).startOf('month'));
    end = getDateString(Moment(end).endOf('month'));
    return getDates(start, end);
});

function LegendItem(props) {
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

function ChartContainer(props) {
    let width = Math.round(props.columns * 0.75) + 'em';
    if (props.scrollable) {
        return (
            <div className="scroll-container-frame">
                <div className="scroll-container">
                    <div className="scroll-container-contents" style={{ width }}>
                        {props.children}
                    </div>
                </div>
            </div>
        );
    } else {
        return props.children;
    }
}

UserStatistics.defaultProps = {
    chartRange: 'biweekly'
};

export {
    UserStatistics as default,
    UserStatistics,
};

import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserStatistics.propTypes = {
        chartType: PropTypes.oneOf([ 'bar', 'line', 'pie' ]),
        chartRange: PropTypes.oneOf([ 'biweekly', 'monthly', 'full' ]),
        dailyActivities: PropTypes.object,
        selectedDate: PropTypes.string,
        user: PropTypes.object,

        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
