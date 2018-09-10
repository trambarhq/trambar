import _ from 'lodash';
import React, { PureComponent } from 'react';

import Environment from 'env/environment';

import StoryTypes from 'objects/types/story-types';

// widgets
import Tooltip from 'widgets/tooltip';

import './activity-tooltip.scss';

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
        let label = t('activity-tooltip-$count', statistics.total);
        if (statistics.total === undefined) {
            label = '-';
        }
        let list = [];
        _.each(StoryTypes, (type, i) => {
            let count = statistics[type];
            if (!count) {
                return;
            }
            let Icon = StoryTypes.icons[type];
            list.push(
                <div className="item" key={i}>
                    <Icon className="icon" />
                    {' '}
                    {t(`activity-tooltip-$count-${type}`, count)}
                </div>
            )
        });
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

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ActivityTooltip.propTypes = {
        statistics: PropTypes.object,
        env: PropTypes.instanceOf(Environment),
    };
}

export {
    ActivityTooltip as default,
    ActivityTooltip,
};
