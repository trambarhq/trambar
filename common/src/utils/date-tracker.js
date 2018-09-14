import _ from 'lodash';
import Moment from 'moment';

const dateTransforms = {
    today: (m) => {
        return m.startOf('day');
    },
    yesterday: (m) => {
        return m.subtract(1, 'day').startOf('day');
    },
    oneWeekAgo: (m) => {
        return m.subtract(7, 'day').startOf('day');
    },
    twoWeeksAgo: (m) => {
        return m.subtract(14, 'day').startOf('day');
    },
    oneMonthAgo: (m) => {
        return m.subtract(1, 'month').startOf('day');
    },
    twoMonthsAgo: (m) => {
        return m.subtract(2, 'month').startOf('day');
    },
    startOfWeek: (m) => {
        if (currentLocale) {
            return m.locale(currentLocale).startOf('week');
        }
    },
    endOfWeek: (m) => {
        if (currentLocale) {
            return m.locale(currentLocale).endOf('week');
        }
    },
    startOfMonth: (m) => {
        return m.startOf('month');
    },
    endOfMonth: (m) => {
        return m.endOf('month');
    },
    startOfLastMonth: (m) => {
        return m.subtract(1, 'month').startOf('month');
    },
    endOfLastMonth: (m) => {
        return m.subtract(1, 'month').endOf('month');
    },
    startOfYear: (m) => {
        return m.startOf('year');
    },
    endOfYear: (m) => {
        return m.endOf('year');
    },
};

let listeners = [];

function addEventListener(type, f) {
    if (type === 'change' && f) {
        listeners.push(f);
    }
}

function removeEventListener(type, f) {
    if (type === 'change' && f) {
        _.pull(listeners, f);
    }
}

let currentLocale = '';

/**
 * Set the locale, used for determining what's the first day of the week
 * (Sunday vs. Monday)
 *
 * @param {String} locale
 */
function setLocale(locale) {
    currentLocale = locale;
    if (updateRelativeDates(Moment())) {
        triggerChangeEvent();
    }
}

function format(m) {
    return m.format('YYYY-MM-DD');
}

/**
 * Derive relative dates from the given times
 *
 * @param  {Moment} m
 *
 * @return {Boolean}
 */
function updateRelativeDates(m) {
    let changed = false;
    _.each(dateTransforms, (f, name) => {
        let r = f(m.clone());
        let before = exports[name];
        if (r) {
            let after = format(r);
            if (before !== after) {
                exports[name] = after;
                exports[name + 'ISO'] = r.toISOString();
                changed = true;
            }
        }
    });
    return changed;
}

let today;

/**
 * Update what today is if a change-over has occurred
 */
function update() {
    let now = Moment();
    let date = format(now);
    if (today !== date) {
        today = date;
        updateRelativeDates(now);
        triggerChangeEvent();
    }
}

/**
 * Inform listeners that the date has changed
 */
function triggerChangeEvent() {
    let evt = {
        type: 'change',
        target: exports,
    };
    _.each(listeners, (f) => {
        f(evt);
    });
}

setInterval(update, 1000);
update();

exports {
    addEventListener,
    removeEventListener,
    setLocale,
    exports as default,
};
