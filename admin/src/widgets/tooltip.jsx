import _ from 'lodash';
import React, { useState, useRef, useCallback, useEffect } from 'react';

import './tooltip.scss';

/**
 * A small pop-up window that shows additional information when the mouse
 * cursor is over a label. It expects two children: inline and window. The
 * inline element holds the contents that's rendered inline, while the
 * window element holds the contents that appear in the pop-up window.
 */
function Tooltip(props) {
    const { upward, leftward, disabled, className, children } = props;
    const [ open, setOpen ] = useState(false);
    const container = useRef();
    const live = hasContents(children);
    const active = open && live && !disabled;

    const inline = findElement(children, 'inline');
    const win = findElement(children, 'window');

    const handleLabelClick = useCallback((evt) => {
        if (live && !disabled) {
            setOpen(!open);
        }
    }, [ open ]);
    const handleMouseDown = useCallback((evt) => {
        if (!isInside(evt.target, container.current)) {
            setOpen(false);
        }
    });
    const handleKeyDown = useCallback((evt) => {
        if (evt.keyCode === 27) {
            setOpen(false);
        }
    });

    useEffect(() => {
        if (active) {
            document.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('mousedown', handleMouseDown);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [ active ])

    const classNames = [ 'tooltip' ];
    if (live && !disabled) {
        classNames.push('live');
    }
    if (upward) {
        classNames.push('upward');
    }
    if (leftward) {
        classNames.push('leftward');
    }
    if (className) {
        classNames.push(className);
    }
    return (
        <div ref={container} className={classNames.join(' ')}>
            {renderLabel()}
            {renderWindow()}
        </div>
    );

    /**
     * Render label
     *
     * @return {ReactElement}
     */
    function renderLabel() {
        return (
            <span className="label" onClick={handleLabelClick}>
                {inline.props.children}
            </span>
        );
    }

    /**
     * Render pop-up
     *
     * @return {ReactElement|null}
     */
    function renderWindow() {
        if (!active) {
            return null;
        }
        return (
            <div className="window-container">
                <div className="window">
                    {win.props.children}
                </div>
            </div>
        );
    }
}

function findElement(children, tagName) {
    children = React.Children.toArray(children);
    return _.find(children, { type: tagName });
}

function hasContents(children, props) {
    const win = findElement(children, 'window');
    if (win) {
        if (React.Children.count(win.props.children) > 0) {
            return true;
        }
    }
    return false;
}

function isInside(element, container) {
    for (let n = element; n; n = n.parentNode) {
        if (n === container) {
            return true;
        }
    }
    return false;
}

export {
    Tooltip as default,
    Tooltip,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Tooltip.propTypes = {
        upward: PropTypes.bool,
        leftward: PropTypes.bool,
        disabled: PropTypes.bool,
    };
}
