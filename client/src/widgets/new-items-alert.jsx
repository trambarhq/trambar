import _ from 'lodash';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';

import './new-items-alert.scss';

/**
 * Component that displays a pop-up message when necessary, alerting the user
 * to the fact that new contents has appeared at the top of the page that they
 * otherwise wouldn't notice due to scrolling.
 */
function NewItemsAlert(props) {
    const { show, url, children, onClick } = props;

    if (url) {
        const classNames = [ 'new-items-alert' ];
        if (show) {
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
                <i className="fa fa-arrow-up" />
                {props.children}
            </a>
        );
        return ReactDOM.createPortal(element, dest);

    } else {
        return null;
    }
}

export {
    NewItemsAlert as default,
};
