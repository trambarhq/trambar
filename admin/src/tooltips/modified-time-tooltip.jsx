import React from 'react';
import { useProgress } from 'relaks';
import Moment from 'moment';
import { delay } from 'common/utils/delay.js';

// widgets
import { Tooltip } from '../widgets/tooltip.jsx';

/**
 * Tooltip showing the full timestamp.
 */
export async function ModifiedTimeTooltip(props) {
  const { env, time, disabled } = props;
  const { localeCode } = env.locale;
  const [ show ] = useProgress(0);

  for (;;) {
    render();
    await interval();
  }

  function render() {
    let relativeTime = null;
    let absoluteTime = null;
    if (time) {
      const m = Moment(time).locale(localeCode);
      relativeTime = m.fromNow();
      absoluteTime = m.format('lll');
    };
    show(
      <Tooltip disabled={disabled}>
        <inline>{relativeTime}</inline>
        <window>{absoluteTime}</window>
      </Tooltip>
    );
  }
}

let intervalPromise = null;

function interval() {
  if (!intervalPromise) {
    intervalPromise = delay(30 * 1000);
    intervalPromise.then(() => {
      intervalPromise = null;
    });
  }
  return intervalPromise;
}
