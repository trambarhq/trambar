import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as RepoUtils from 'objects/utils/repo-utils';

// widgets
import Tooltip from 'widgets/tooltip';

import './repository-tooltip.scss';

/**
 * Tooltip showing a list of repos.
 *
 * @extends PureComponent
 */
class RepositoryTooltip extends PureComponent {
    static displayName = 'RepositoryTooltip';

    render() {
        let { route, env, repos, project, disabled } = this.props;
        let { t } = env.locale;
        if (!repos) {
            return null;
        }
        let label = t('repository-tooltip-$count', repos.length);
        let list = _.map(repos, (repo, i) => {
            let url = route.find('repo-summary-page', {
                projectID: project.id,
                repoID: repo.id,
            });
            let iconName = repo.type;
            let name = RepoUtils.getDisplayName(repo, env);
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
        let listURL = route.find('repo-list-page', { projectID: project.id });
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
}

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
