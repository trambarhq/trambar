import React from 'react';

import './url-link.scss';

function URLLink(props) {
  const { url } = props;
  if (!/^https?:\/\/\S+/.test(url)) {
    return null;
  }
  return (
    <a className="url-link" href={url} target="_blank">
      <i className="fa fa-external-link" />
    </a>
  );
}

export {
  URLLink as default,
  URLLink,
};
