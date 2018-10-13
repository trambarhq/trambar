import _ from 'lodash';
import React, { PureComponent } from 'react';

/**
 * A hyperlink component that may store the URL in the "data-url" attribute
 * instead of "href" so that the browser does not display a status bar when
 * the mouse cursor is over it. This capability is utilized by the bottom
 * navigation, so that buttons would remain unobstructed. When the component
 * has keyboard focus, a true hyperlink is always rendered.
 *
 * @extends PureComponent
 */
class Link extends PureComponent {
    static displayName = 'Link';

    constructor(props) {
        super(props);
        this.state = {
            hasFocus: false
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { url, alwaysAsLink, children } = this.props;
        let { hasFocus } = this.state;
        let props = _.omit(this.props, 'url', 'alwaysAsLink');
        if (url) {
            if (alwaysAsLink) {
                // always set href
                props.href = url;
            } else {
                // set href only when link has focus
                if (hasFocus) {
                    props.href = url;
                } else {
                    props['data-url'] = url;
                }
                if (props.tabIndex === undefined) {
                    props.tabIndex = 0;
                }
                props.onFocus = this.handleFocus;
                props.onBlur = this.handleBlur;
            }
        }
        return (
            <a {...props}>{children}</a>
        );
    }

    /**
     * Called when component gains keyboard focus
     *
     * @param  {Event} evt
     */
    handleFocus = (evt) => {
        this.setState({ hasFocus: true });
    }

    /**
     * Called when component loses keyboard focus
     *
     * @param  {Event} evt
     */
    handleBlur = (evt) => {
        this.setState({ hasFocus: false });
    }
}

Link.defaultProps = {
    alwaysAsLink: true, // TODO: set this back to false
};

export {
    Link as default,
    Link,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Link.propTypes = {
        url: PropTypes.string,
        alwaysAsLink: PropTypes.bool,
    };
}
