import _ from 'lodash';
import React, { PureComponent } from 'react';

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
        let props = _.omit(this.props, 'url', 'alwaysAsLink');
        if (this.props.url) {
            if (this.props.alwaysAsLink) {
                // always set href
                props.href = this.props.url;
            } else {
                // set href only when link has focus
                if (this.state.hasFocus) {
                    props.href = this.props.url;
                } else {
                    props['data-url'] = this.props.url;
                }
                if (props.tabIndex === undefined) {
                    props.tabIndex = 0;
                }
                props.onFocus = this.handleFocus;
                props.onBlur = this.handleBlur;
            }
        }
        return (
            <a {...props}>{this.props.children}</a>
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
    alwaysAsLink: false,
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
