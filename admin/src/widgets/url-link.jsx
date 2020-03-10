import React from 'react';

import './url-link.scss';

export function URLLink(props) {
  const { url } = props;
  if (!/^https?:\/\/\S+/.test(url)) {
    return null;
  }
  return (
    <a className="url-link" href={url} target="_blank">
      <i className="fas fa-external-link-alt" />
    </a>
  );
}
