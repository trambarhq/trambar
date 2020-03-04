import React, { useState, useMemo, useEffect } from 'react';
import Moment from 'moment';

import './time.scss';

/**
 * Component for rendering the publication time of a story or reaction.
 * Depending on how long ago it was, it'll display either the amount of time
 * elapsed since or an actual date.
 */
export function Time(props) {
  const { env, time, compact } = props;
  const { t } = env.locale;
  const [ updateTime, setUpdateTime ] = useState();
  const then = useMemo(() => Moment(time), [ time ]);

  let className = 'older';
  let text;
  let updateAfter = 0;
  if (time >= env.getRelativeDate(-10, 'day')) {
    // call getRelativeDate() so we have an ISO date string
    if (time >= env.getRelativeDate(0, 'day')) {
      const now = Moment();
      const elapsed = (now - then) * (1 / 1000);
      if (elapsed < 60) {
        text = t('time-just-now');
        updateAfter = 20;
      } else if (elapsed < 60 * 60) {
        let minutes = Math.floor(elapsed * (1 / 60));
        if (compact) {
          text = t('time-$min-ago', minutes);
        } else {
          text = t('time-$minutes-ago', minutes);
        }
        updateAfter = 60;
      } else {
        let hours = Math.floor(elapsed * (1 / 3600));
        if (compact) {
          text = t('time-$hr-ago', hours);
        } else {
          text = t('time-$hours-ago', hours);
        }
        updateAfter = 60 * 10;
      }
      className = 'today';
    } else if (time >= env.getRelativeDate(-1, 'day')) {
      className = 'yesterday';
      text = t('time-yesterday');
      updateAfter = 60 * 60 * 1;
    } else {
      for (let day = 2; day <= 10; day++) {
        if (time >= env.getRelativeDate(-day, 'day')) {
          text = t('time-$days-ago', day);
          break;
        }
      }
      updateAfter = 60 * 60 * 1;
    }
  } else {
    text = then.format((compact) ? 'll' : 'LL');
  }
  const title = then.format((compact) ? 'lll' : 'LLL');

  useEffect(() => {
    if (updateAfter) {
      setTimeout(() => {
        setUpdateTime(new Date);
      }, updateAfter * 1000);
    }
  }, [ updateAfter ]);

  return <span className={`time ${className}`} title={title}>{text}</span>;
}

Time.defaultProps = {
  compact: false,
};
