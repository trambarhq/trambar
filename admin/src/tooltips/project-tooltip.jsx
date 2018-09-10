import _ from 'lodash';
import React, { PureComponent } from 'react';

import Route from 'routing/route';
import Environment from 'env/environment';

// widgets
import Tooltip from 'widgets/tooltip';

import './project-tooltip.scss';

class ProjectTooltip extends PureComponent {
    static displayName = 'ProjectTooltip';

    render() {
        let { route, env, projects, disabled } = this.props;
        let { t, p } = env.locale;
        if (!projects) {
            return null;
        }
        let first = '-';
        if (projects.length > 0) {
            // list the first project
            let project0 = projects[0]
            let url0;
            if (!disabled) {
                url0 = route.find('project-summary-page', {
                    project: project0.id,
                });
            }
            let title0 = p(project0.details.title) || project0.name;
            first = <a href={url0} key={0}>{title0}</a>;
            projects = _.slice(projects, 1);
        }
        let contents;
        if (projects.length > 0) {
            let ellipsis;
            let label = t('project-tooltip-$count-others', projects.length);
            if (projects.length > 10) {
                projects = _.slice(projects, 0, 10);
                ellipsis = <div className="ellipsis"><i className="fa fa-ellipsis-v" /></div>;
            }
            let list = _.map(projects, (project, i) => {
                let url = route.find('project-summary-page', { project: project.id });
                let title = p(project.details.title) || project.name;
                return (
                    <div className="item" key={i}>
                        <a href={url}>
                            {title}
                        </a>
                    </div>
                );
            });
            let listURL = route.find('project-list-page', {});
            let tooltip = (
                <Tooltip className="project" disabled={disabled || list.length === 0} key={1}>
                    <inline>{label}</inline>
                    <window>
                        {list}
                        {ellipsis}
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
        return <span>{contents}</span>;
    }
}

export {
    ProjectTooltip as default,
    ProjectTolltip,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ProjectTooltip.propTypes = {
        projects: PropTypes.arrayOf(PropTypes.object),
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
