import _ from 'lodash';
import React, { PureComponent } from 'react';

import Environment from 'common/env/environment.mjs';

import { StoryTypes, StoryIcons } from 'common/objects/types/story-types.mjs';

// widgets
import Tooltip from '../widgets/tooltip.jsx';

import './activity-tooltip.scss';

/**
 * Tooltip listing the number of activities by type.
 *
 * @extends PureComponent
 */
class ActivityTooltip extends PureComponent {
    static displayName = 'ActivityTooltip';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env, statistics, disabled } = this.props;
        let { t } = env.locale;
        if (!statistics) {
            return null;
        }
        if (statistics.total === 0 && statistics.dirty) {
            // don't show 0 when stats are in the process of being generated
            return null;
        }
        let label = t('activity-tooltip-$count', statistics.total);
        if (statistics.total === undefined) {
            label = '-';
        }
        let list = [];
        for (let type of StoryTypes) {
            let count = statistics[type];
            if (count) {
                let Icon = StoryIcons[type];
                list.push(
                    <div className="item" key={type}>
                        <Icon className="icon" />
                        {' '}
                        {t(`activity-tooltip-$count-${type}`, count)}
                    </div>
                );
            }
        }
        return (
            <Tooltip className="activity" disabled={disabled}>
                <inline>{label}</inline>
                <window>
                    {list}
                </window>
            </Tooltip>
        );
    }
}

export {
    ActivityTooltip as default,
    ActivityTooltip,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ActivityTooltip.propTypes = {
        statistics: PropTypes.object,
        env: PropTypes.instanceOf(Environment),
    };
}
