import React, { Component } from 'react';

require('./error-boundary.scss');

class ErrorBoundary extends Component {
    static displayName = 'ResourceView';

    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    render() {
        let { children } = this.props;
        let { error } = this.state;
        if (error) {
            return <div className="error-boundary">{error.message}</div>;
        }
        return children;
    }

    componentDidCatch(error, info) {
        let { env } = this.props;
        this.setState({ error });
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
