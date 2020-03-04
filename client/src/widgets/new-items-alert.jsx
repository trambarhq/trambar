import _ from 'lodash';
import React, { useState, useEffect } from 'react';
import { useLastAcceptable } from 'relaks';
import ReactDOM from 'react-dom';

// custom hooks
import {
  useAfterglow,
} from '../hooks.js';

import './new-items-alert.scss';

/**
 * Component that displays a pop-up message when necessary, alerting the user
 * to the fact that new contents has appeared at the top of the page that they
 * otherwise wouldn't notice due to scrolling.
 */
export function NewItemsAlert(props) {
  const { url, children, onClick } = props;
  const [ container, setContainer ] = useState(null);
  const show = useAfterglow(!!url, 500);
  const contents = useLastAcceptable(children, !(show && !url));

  useEffect(() => {
    if (show) {
      const viewport = document.getElementsByClassName('page-view-port')[0];
      const node = document.createElement('DIV');
      viewport.appendChild(node);
      setContainer(node);
      return () => {
        viewport.removeChild(node);
      };
    } else {
      setContainer(null);
    }
  }, [ show ]);

  if (container) {
    const classNames = [ 'new-items-alert' ];
    if (url) {
      classNames.push('show');
    } else {
      classNames.push('hide');
    }
    const anchorProps = {
      className: classNames.join(' '),
      href: url,
      onClick,
    };
    const element = (
      <a {...anchorProps}>
        <i className="fasfa-arrow-up" />
        {contents}
      </a>
    );
    return ReactDOM.createPortal(element, container);
  } else {
    return null;
  }
}
