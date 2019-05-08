import _ from 'lodash';
import React from 'react';

// widgets
import { Tooltip } from '../widgets/tooltip.jsx';

import './project-tooltip.scss';

/**
 * Tooltip showing a list of projects.
 */
function ProjectTooltip(props) {
    const { route, env, projects, disabled } = props;
    const { t, p } = env.locale;
    if (!projects) {
        return null;
    }
    const list = _.map(projects, (project, i) => {
        const title = p(project.details.title) || project.name;
        const url = route.find('project-summary-page', {
            projectID: project.id
        });
        return (
            <div className="item" key={i}>
                <a href={disabled ? undefined : url}>{title}</a>
            </div>
        );
    });
    let contents = '-';
    if (list.length > 0) {
        const firstElement = list.shift();
        const first = firstElement.props.children;
        if (list.length > 0) {
            const label = t('project-tooltip-$count-others', list.length);
            const max = 10;
            if (list.length > max) {
                list.splice(max);
                list.push(
                    <div className="ellipsis" key={0}>
                        <i className="fa fa-ellipsis-v" />
                    </div>
                );
            }
            const listURL = route.find('project-list-page', {});
            const tooltip = (
                <Tooltip className="project" disabled={disabled || list.length === 0} key={1}>
                    <inline>{label}</inline>
                    <window>
                        {list}
                        <div className="bottom">
                            <a href={listURL}>{t('tooltip-more')}</a>
                        </div>
                    </window>
                </Tooltip>
            );
            contents = t('tooltip-$first-and-$tooltip', first, tooltip);
        } else {
            contents = first;
        }
    }
    return <span>{contents}</span>;
}

export {
    ProjectTooltip as default,
    ProjectTooltip,
};
