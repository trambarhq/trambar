import Moment from 'moment';
import React, { useMemo } from 'react';
import { useProgress, useListener } from 'relaks';
import { getWebsiteAddress } from 'common/objects/utils/project-utils.js';
import { findSnapshotAuthors } from 'common/objects/finders/user-finder.js';
import { getUserName } from 'common/objects/utils/user-utils.js';
import { orderBy } from 'common/utils/array-utils.js';

import './snapshot-list.scss';

export async function SnapshotList(props) {
  const { database, project, role, template, snapshots } = props;
  const { env } = props;
  const { t, f, localeCode } = env.locale;
  const [ show ] = useProgress();
  const projectURL = getWebsiteAddress(project);
  const snapshotsSorted = useMemo(() => {
    return orderBy(snapshots, 'ptime', 'desc');
  }, [ snapshots ]);

  render();
  const authors = await findSnapshotAuthors(database, snapshots);
  render();

  function render() {
    show(
      <div className="snapshot-list">
        {renderItems()}
      </div>
    );
  }

  function renderItems() {
    if (template === null) {
      return renderGeneric();
    } else {
      return snapshotsSorted.map(renderItem);
    }
  }

  function renderItem(snapshot, i) {
    const head = snapshot.head;
    const branch = snapshot.branch_name;
    const commit = snapshot.commit_id;
    const m = Moment(snapshot.ptime).locale(localeCode);
    const relativeTime = m.fromNow();
    const absoluteTime = m.format('lll');
    let url, id;
    if (head) {
      if (branch === 'master') {
        url = projectURL;
      } else {
        url = `${projectURL}(${branch})/`
      }
      id = 'HEAD';
    } else {
      url = `${projectURL}(${commit})/`;
      id = commit.substr(0, 8);
    }

    const author = authors.find(u => u.id === snapshot.user_id);
    const authorName = getUserName(author, env);

    const classNames = [ 'snapshot' ];
    if (head) {
      classNames.push('head');
    } else {
      classNames.push('old');
    }
    if (branch === 'master') {
      classNames.push('master');
    }
    return (
      <a href={url} target="_blank" key={i}>
        <div className={classNames.join(' ')}>
          <div className="commit">
            <span className="branch">{branch}</span>
            {' '}
            <span className="id">({id})</span>
          </div>
          <div className="time" title={absoluteTime}>
            {relativeTime}
          </div>
          <div className="name" title={absoluteTime}>
            {authorName}
          </div>
        </div>
      </a>
    );
  }

  function renderGeneric() {
    const url = projectURL;
    const classNames = [ 'snapshot', 'head', 'master' ];
    return (
      <a href={url} target="_blank">
        <div className={classNames.join(' ')}>
          <div className="commit">
            <span className="branch">{t('website-summary-template-generic')}</span>
          </div>
        </div>
      </a>
    );
  }
}
