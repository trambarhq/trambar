import React from 'react';
import { isActuallyPublished } from 'common/objects/utils/reaction-utils.js';

// widgets
import { Time } from './time.jsx';

import './reaction-progress.scss';

/**
 * Stateless component that render either the publication time or progress in
 * publishing a reaction, when doing so requires significant amount of time due
 * to attached media.
 */
export function ReactionProgress(props) {
  const { env, reaction, status } = props;
  const { t } = env.locale;
  let contents;
  if (!isActuallyPublished(reaction)) {
    // not saved yet
    contents = t('reaction-status-storage-pending');
  } else {
    if (status) {
      contents = t(`reaction-status-${status.action}`);
    } else {
      contents = <Time time={reaction.ptime} env={env} compact={true} />;
    }
  }
  return <span className="reaction-progress">{contents}</span>;
}
