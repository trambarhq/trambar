import _ from 'lodash';
import Moment from 'moment';
import React from 'react';
import Relaks, { useProgress, useListener } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as TaskFinder from 'common/objects/finders/task-finder.mjs';
import * as ProjectUtils from 'common/objects/utils/project-utils.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

import './snapshot-list.scss';

async function SnapshotList(props) {
    const { database, project, role, template, snapshots} = props;
    const { env } = props;
    const { t, f, localeCode } = env.locale;
    const [ show ] = useProgress();
    const projectURL = ProjectUtils.getWebsiteAddress(project);

    render();
    const authors = await UserFinder.findSnapshotAuthors(database, snapshots);
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
            return _.map(snapshots, renderItem);
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

        const author = _.find(authors, { id: snapshot.user_id });
        const authorName = UserUtils.getDisplayName(author, env);

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
        return (
            <div className="generic">

            </div>
        );
    }
}

const component = Relaks.memo(SnapshotList);

export {
    component as SnapshotList,
};
