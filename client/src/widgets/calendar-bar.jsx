import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Moment from 'moment';
import * as StatisticsFinder from 'objects/finders/statistics-finder';
import * as UserFinder from 'objects/finders/user-finder';

// widgets
import Calendar from 'widgets/calendar';

require('./calendar-bar.scss');

class CalendarBar extends AsyncComponent {
    static displayName = 'CalendarBar';

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        let currentUserId;
        let props = {
            dailyActivities: null,

            settings: this.props.settings,
            route: this.props.route,
            locale: this.props.locale,
        };
        meanwhile.show(<CalendarBarSync {...props} />);
        return db.start().then((userId) => {
            return UserFinder.findUser(db, userId);
        }).then((user) => {
            let params = _.clone(this.props.settings.statistics);
            if (params.user_id === 'current') {
                params.user_id = user.id;
            }
            if (params.public === 'guest') {
                params.public = (user.type === 'guest');
            }
            return StatisticsFinder.find(db, params);
        }).then((statistics) => {
            props.dailyActivities = statistics;
            return <CalendarBarSync {...props} />;
        });
    }
}

class CalendarBarSync extends PureComponent {
    static displayName = 'CalendarBar.Sync';

    render() {
        let endOfThisMonth = Moment().endOf('month');
        let months = [];
        let multiyear = false;
        let startTime = _.get(this.props.dailyActivities, 'range.start');
        let endTime = _.get(this.props.dailyActivities, 'range.end');
        let selectedDate = this.props.route.parameters.date;
        if (startTime && endTime) {
            let s = Moment(startTime).startOf('month');
            let e = Moment(endTime).endOf('month');
            if (s.year() != e.year()) {
                multiyear = true;
            }
            if (endOfThisMonth > e) {
                // always render to current month
                e = endOfThisMonth;
            }
            for (let m = s.clone(); m <= e; m.add(1, 'month')) {
                months.push({
                    year: m.year(),
                    month: m.month() + 1,
                });
            }
        } else {
            // just render the current month when there's no range info yet
            months.push({
                year: endOfThisMonth.year(),
                month: endOfThisMonth.month() + 1,
            });
        }
        months.reverse();
        let calendars = _.map(months, (month, index) => {
            let props = {
                year: month.year,
                month: month.month,
                showYear: multiyear,
                selection: selectedDate,
                locale: this.props.locale,
                onDateURL: this.handleDateURL,
            };
            return <Calendar key={index} {...props} />;
        });
        return (
            <div className="calendar-bar">
                {calendars}
            </div>
        );
    }

    /**
     * Called when calendar needs the URL for the
     *
     * @param  {Object} evt
     *
     * @return {String|undefined}
     */
    handleDateURL = (evt) => {
        let activities = _.get(this.props.dailyActivities, [ 'daily', evt.date ]);
        if (activities) {
            let route = this.props.route;
            let params = _.assign({ date: evt.date }, this.props.settings.route);
            let url = route.find(route.component, params);
            return url;
        }
    }
}

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    CalendarBar.propTypes = {
        settings: PropTypes.object.isRequired,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    CalendarBarSync.propTypes = {
        settings: PropTypes.object.isRequired,
        dailyActivities: PropTypes.object,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
