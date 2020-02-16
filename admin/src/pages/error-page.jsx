import React from 'react';

import Unicorn from 'common-assets/unicorn.svg';

import './error-page.scss';

/**
 * Component that renders the Error page.
 */
function ErrorPage(props) {
  return (
    <div className="error-page">
      <div>
        <div className="graphic"><Unicorn /></div>
        <div className="text">
          <h1 className="title">404 Not Found</h1>
          <p>The page you're trying to reach doesn't exist. But then again, who does?</p>
        </div>
      </div>
    </div>
  );
}

export {
  ErrorPage as default,
  ErrorPage,
};
