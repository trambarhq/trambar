import _ from 'lodash';
import Promise from 'promise';
import React, { PureComponent } from 'react';
import Chartist from 'widgets/chartist';
import Moment from 'moment';
import DateTracker from 'utils/date-tracker';
import Memoize from 'utils/memoize';

import StoryTypes from 'objects/types/story-types';

import './activity-chart.scss';

class ActivityChart extends PureComponent {
    static displayName = 'ActivityChart';

    render() {
        let { children } = this.props;
        return (
            <div className="activity-chart">
                <h2>{children}</h2>
                {this.renderLegend()}
                {this.renderChart()}
            </div>
        );
    }

    renderChart() {
        let { statistics } = this.props;
        if (!statistics) {
            return (
                <div className="scroll-container">
                    <div className="contents no-data" />
                </div>
            );
        }
        let today = Moment(DateTracker.today);
        let rangeStart = Moment(statistics.range.start);
        let rangeEnd = Moment(statistics.range.end);

        let endOfThisMonth = today.clone().endOf('month');
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

        let dates = getDateStrings(startDate, endDate);
        let series = getActivitySeries(statistics.daily, dates);
        let upperRange = getUpperRange(series, true);
        let labels = getDateStrings(startDate, endDate);
        let chartProps = {
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
                        let day = getDay(date);
                        if (day === 1) {
                            return date;
                        } else if (day > 10 && date == DateTracker.today){
                            return 'Today';
                        }
                        return '';
                    }
                },
            },
            onDraw: this.handleDraw,
        };
        let width = Math.round(labels.length * 0.75) + 'em';
        return (
            <div className="scroll-container">
                <div className="contents" style={{ width }}>
                    <Chartist {...chartProps} />
                </div>
            </div>
        );
    }

    /**
     * Render legend for data series
     *
     * @return {ReactElement}
     */
    renderLegend() {
        let { env, statistics } = this.props;
        let { t } = env.locale;
        if (!statistics) {
            return null;
        }
        let stats = statistics.to_date;
        let indices = {};
        _.each(StoryTypes, (type, index) => {
            if (stats[type] > 0) {
                indices[type] = index;
            }
        });
        let items = _.map(indices, (index, type) => {
            let props = {
                series: String.fromCharCode('a'.charCodeAt(0) + index),
                label: t(`activity-chart-legend-${type}`),
            };
            return <LegendItem key={index} {...props} />;
        });
        if (_.isEmpty(items)) {
            items = '\u00a0';
        }
        return <div className="legend">{items}</div>;
    }

    handleDraw = (cxt) => {
        // move y-axis to the right side
        if(cxt.type === 'label' && cxt.axis.units.pos === 'y') {
            cxt.element.attr({
                x: cxt.axis.chartRect.width() + 20
            });
        }
        // style grid line differently when it's the first day
        // of the month or today
        if (cxt.type === 'grid' && cxt.axis.units.pos === 'x') {
            let date = cxt.axis.ticks[cxt.index];
            let day = getDay(date);
            if (day === 1) {
                cxt.element.addClass('month-start');
            } else if (date === DateTracker.today) {
                cxt.element.addClass('today');
            }
        }
    }
}

let getDateStrings = Memoize(function(startDate, endDate) {
    let dates = [];
    for (let d = startDate.clone(); d <= endDate; d.add(1, 'day')) {
        dates.push(d.format('YYYY-MM-DD'));
    }
    return dates;
});

let getDateLabels = Memoize(function(startDate, endDate) {
    let labels = [];
    for (let d = startDate.clone(); d <= endDate; d.add(1, 'month')) {
        labels.push(d.format('ll'));

        let days = d.daysInMonth();
        for (let i = 1; i < days; i++) {
            labels.push(null);
        }
    }
    return labels;
});

let getActivitySeries = Memoize(function(activities, dates) {
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
        return (empty) ? [] : series;
    });
});

let getUpperRange = Memoize(function(series, additive) {
    let highest = 0;
    if (additive) {
        let sums = [];
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
            let max = _.max(values);
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

export {
    ActivityChart as default,
    ActivityChart,
    LegendItem,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ActivityChart.propTypes = {
        statistics: PropTypes.object,
        env: PropTypes.instanceOf(Environment),
    };
}
