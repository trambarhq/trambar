import React from 'react';

import './action-badge.scss'

/**
 * Stateless component that indicates what action will be performed on an item.
 */
function ActionBadge(props) {
    let { env, type } = props;
    let { t } = env.locale;
    let className = 'text', icon;
    switch (props.type) {
        case 'add':
        case 'approve':
        case 'restore':
        case 'reactivate':
            className += ' add';
            icon = 'plus';
            break;
        case 'remove':
        case 'archive':
        case 'disable':
            className += ' remove';
            icon = 'times';
            break;
    }
    let label = t(`action-badge-${type}`);
    return (
        <div className="action-badge">
            <div className="container">
                <span className={className}>
                    <i className={`fa fa-${icon}`} /> {label}
                </span>
            </div>
        </div>
    );
}

export {
    ActionBadge as default,
    ActionBadge
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ActionBadge.propTypes = {
        type: PropTypes.string.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
