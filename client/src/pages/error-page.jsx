import React from 'react';

// widgets
import Unicorn from 'common-assets/unicorn.svg';
import { PageContainer } from '../widgets/page-container.jsx';

import './error-page.scss';

/**
 * Component for the Error page.
 */
export default function ErrorPage(props) {
  return (
    <PageContainer className="error-page">
      <div className="graphic"><Unicorn /></div>
      <div className="text">
        <h1 className="title">404 Not Found</h1>
        <p>The page you're trying to reach doesn't exist. But then again, who does?</p>
      </div>
    </PageContainer>
  );
}
