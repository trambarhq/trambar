import _ from 'lodash';
import React from 'react';
import { getRepoName } from 'common/objects/utils/repo-utils.js';

// widgets
import { Tooltip } from '../widgets/tooltip.jsx';

import './repository-tooltip.scss';

/**
 * Tooltip showing a list of repos.
 */
export function RepositoryTooltip(props) {
  const { route, env, repos, project, disabled } = props;
  const { t } = env.locale;
  if (!repos) {
    return null;
  }
  const label = t('repository-tooltip-$count', repos.length);
  const list = _.map(repos, (repo, i) => {
    const url = route.find('repo-summary-page', {
      projectID: project.id,
      repoID: repo.id,
    });
    const iconName = repo.type;
    const name = getRepoName(repo, env);
    return (
      <div className="item" key={repo.id}>
        <a href={url}>
          <i className={`fa fa-${iconName}`}/> {name}
        </a>
      </div>
    );
  });
  const max = 10;
  if (list.length > max) {
    list.splice(max);
    list.push(
      <div className="ellipsis" key={0}>
        <i className="fas fa-ellipsis-v" />
      </div>
    );
  }
  const listURL = route.find('repo-list-page', { projectID: project.id });
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
