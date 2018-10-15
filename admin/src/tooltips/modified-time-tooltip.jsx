import _ from 'lodash';
import React, { PureComponent } from 'react';
import Moment from 'moment';

import Environment from 'env/environment';

// widgets
import Tooltip from 'widgets/tooltip';

/**
 * Tooltip showing the full timestamp.
 *
 * @extends PureComponent
 */
class ModifiedTimeTooltip extends PureComponent {
    static displayName = 'ModifiedTimeTooltip';

    /**
     * Set the text labels on mount
     */
    componentWillMount() {
        this.updateLabels();
    }

    /**
     * Update text labels on receiving new props
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        this.updateLabels(nextProps);
    }

    /**
     * Parse time string and format relative and absolute dates
     *
     * @param  {Object} props
     */
    updateLabels(props) {
        let { env, time } = props || this.props;
        let { localeCode } = env.locale;
        let m;
        if (time) {
            m = Moment(time);
            m.locale(localeCode);
        };
        let state = {
            relativeTime: m ? m.fromNow() : null,
            absoluteTime: m ? m.format('lll') : null,
        };
        if (!_.isEqual(state, this.state)) {
            this.setState(state);
        }
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
    _.each(instances, (instance) => {
        instance.updateLabels();
    });
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
