import _ from 'lodash';
import React, { PureComponent } from 'react';
import Moment from 'moment';

import Environment from 'common/env/environment.mjs';

// widgets
import Tooltip from '../widgets/tooltip.jsx';

/**
 * Tooltip showing the full timestamp.
 *
 * @extends PureComponent
 */
class ModifiedTimeTooltip extends PureComponent {
    static displayName = 'ModifiedTimeTooltip';

    constructor(props) {
        super(props);
        this.state = {
            relativeTime: null,
            absoluteTime: null,
        };
    }

    static getDerivedStateFromProps(props) {
        let { env, time } = props;
        let { localeCode } = env.locale;
        let m;
        if (time) {
            m = Moment(time);
            m.locale(localeCode);
        };
        return {
            relativeTime: m ? m.fromNow() : null,
            absoluteTime: m ? m.format('lll') : null,
        };
    }

    render() {
        let { disabled } = this.props;
        let { relativeTime, absoluteTime } = this.state;
        return (
            <Tooltip disabled={disabled}>
                <inline>{relativeTime}</inline>
                <window>{absoluteTime}</window>
            </Tooltip>
        );
    }

    componentDidMount() {
        instances.push(this);
    }

    componentWillUnmount() {
        _.pull(instances, this);
    }
}

let instances = [];

// refresh the labels every minute
setInterval(() => {
    for (let instance of instances) {
        instance.forceUpdate();
    }
}, 30 * 1000);

export {
    ModifiedTimeTooltip as default,
    ModifiedTimeTooltip,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ModifiedTimeTooltip.propTypes = {
        time: PropTypes.string,
        disabled: PropTypes.bool,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
