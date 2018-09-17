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
        let { database, route, env, settings } = this.props;
        let db = database.use({ by: this });
        let currentUserID;
        let props = {
            dailyActivities: null,

            settings,
            route,
            env,
        };
        meanwhile.show(<CalendarBarSync {...props} />);
        return db.start().then((currentUserID) => {
            return UserFinder.findUser(db, currentUserID);
        }).then((currentUser) => {
            let params = _.clone(settings.statistics);
            if (params.user_id === 'current') {
                params.user_id = currentUser.id;
            }
            if (params.public === 'guest') {
                params.public = (currentUser.type === 'guest');
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
        let { route, env, dailyActivities } = this.props;
        let endOfThisMonth = Moment().endOf('month');
        let months = [];
        let multiyear = false;
        let startTime = _.get(dailyActivities, 'range.start');
        let endTime = _.get(dailyActivities, 'range.end');
        let selectedDate = route.params.date;
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
                emv,
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
        let { route, dailyActivities, settings } = this.props;
        let activities = _.get(dailyActivities, [ 'daily', evt.date ]);
        if (activities) {
            let params = _.assign({ date: evt.date }, settings.route);
            let url = route.find(route.name, params);
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
