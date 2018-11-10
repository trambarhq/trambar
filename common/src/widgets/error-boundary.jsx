import React, { Component } from 'react';

require('./error-boundary.scss');

/**
 * Component for trapping JavaScript exeception encountered during rendering
 * cycles.
 *
 * @extends {Component}
 */
class ErrorBoundary extends Component {
    static displayName = 'ErrorBoundary';

    constructor(props) {
        super(props);
        this.state = { error: null, errorChildren: null };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.children !== state.errorChildren) {
            return { error: null, errorChildren: null };
        }
        return null;
    }

    render() {
        let { children } = this.props;
        let { error } = this.state;
        if (error) {
            return <div className="error-boundary">{error.message}</div>;
        }
        return children || null;
    }

    componentDidCatch(error, info) {
        let { env, children } = this.props;
        this.setState({ error, errorChildren: children });
        env.logError(error, info);
    }
}

export {
    ErrorBoundary as default,
    ErrorBoundary,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ErrorBoundary.propTypes = {
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
