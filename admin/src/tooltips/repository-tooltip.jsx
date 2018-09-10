import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Tooltip from 'widgets/tooltip';

import './repository-tooltip.scss';

class RepositoryTooltip extends PureComponent {
    static displayName = 'RepositoryTooltip';

    render() {
        let { route, env, repos, project, disabled } = this.props;
        let { t, p } = env.locale;
        if (!repos) {
            return null;
        }
        let label = t('repository-tooltip-$count', repos.length);
        let list = _.map(repos, (repo, i) => {
            let url = route.find('repo-summary-page', {
                project: project.id,
                repo: repo.id,
            });
            let iconName = repo.type;
            let name = p(repo.details.title) || t(`server-type-${repo.type}`);
            return (
                <div className="item" key={i}>
                    <a href={url}>
                        <i className={`fa fa-${iconName}`}/>
                        {' '}
                        {name}
                    </a>
                </div>
            );
        });
        let listURL = route.find('repo-list-page', { project: project.id });
        return (
            <Tooltip className="repository" disabled={disabled || list.length === 0}>
                <inline>{label}</inline>
                <window>
                    {list}
                    <div className="bottom">
                        <a href={listURL}>{t('tooltip-more')}</a>
                    </div>
                </window>
            </Tooltip>
        );
    }
});

export {
    RepositoryTooltip as default,
    RepositoryTooltip,
};

import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    RepositoryTooltip.propTypes = {
        repos: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object.isRequired,
        route: PropTypes.object.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        disabled: PropTypes.bool,
    };
}
