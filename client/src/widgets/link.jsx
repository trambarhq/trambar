import _ from 'lodash';
import React, { useState } from 'react';
import { useListener } from 'relaks';

/**
 * A hyperlink component that may store the URL in the "data-url" attribute
 * instead of "href" so that the browser does not display a status bar when
 * the mouse cursor is over it. This capability is utilized by the bottom
 * navigation, so that buttons would remain unobstructed. When the component
 * has keyboard focus, a true hyperlink is always rendered.
 */
function Link(props) {
    const { url, alwaysAsLink, blurDelay, children, ...otherProps } = props;
    const [ hasFocus, setHasFocus ] = useState(false);

    const handleFocus = useListener((evt) => {
        setHasFocus(true);
    });
    const handleBlur = useListener((evt) => {
        setHasFocus(true);
    });
    const handleClick = useListener((evt) => {
        const link = evt.currentTarget;
        if (blurDelay) {
            setTimeout(() => {
                link.blur();
            }, blurDelay);
        }
    });

    const aprops = { ...otherProps };
    if (url) {
        if (alwaysAsLink) {
            // always set href
            aprops.href = url;
        } else {
            // set href only when link has focus on we're in the middle of a click
            if (hasFocus) {
                aprops.href = url;
            }
            aprops.onFocus = handleFocus;
            aprops.onBlur = handleBlur;
        }
        if (aprops.tabIndex === undefined) {
            aprops.tabIndex = 0;
        }
        aprops.onClick = handleClick;
    }
    return (
        <a {...aprops}>{children}</a>
    );
}

Link.defaultProps = {
    alwaysAsLink: false,
    blurDelay: 200,
};

export {
    Link as default,
    Link,
};
