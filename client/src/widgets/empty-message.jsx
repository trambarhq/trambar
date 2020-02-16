import React from 'react';

import './empty-message.scss';

/**
 * A simple stateless component that displays a message stating that there's
 * no contents. If the reason for lack of contents might be the lack of
 * Internet access, an alternate message will say so to that effect.
 */
function EmptyMessage(props) {
  let { env, phrase } = props;
  let { t } = env.locale;
  if (!env.online) {
    phrase = 'empty-currently-offline';
  }
  return (
    <div className="empty-message">
      <div className="text">{t(phrase)}</div>
    </div>
  );
}

export {
  EmptyMessage as default,
  EmptyMessage,
};
