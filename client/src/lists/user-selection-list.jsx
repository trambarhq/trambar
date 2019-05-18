import _ from 'lodash';
import React, { useCallback } from 'react';
import Relaks, { useProgress } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import ProfileImage from '../widgets/profile-image.jsx';

import './user-selection-list.scss';

async function UserSelectionList(props) {
    const { database, route, env, selection, disabled, onSelect } = props;
    const db = database.use({ by: this });
    const [ show ] = useProgress();

    const handleUserClick = useCallback((evt) => {
        const userID = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        const newSelection = _.toggle(selection, userID);
        if (onSelect) {
            onSelect({ selection: newSelection });
        }
    });

    render();
    const currentUserID = await db.start();
    const project = await ProjectFinder.findCurrentProject(db);
    const users = await UserFinder.findProjectMembers(db, project);
    render();

    function render() {
        const sorted = sortUsers(users, env);
        show(
            <div className="user-selection-list">
                {_.map(sorted, renderUser)}
            </div>
        );
    }

    function renderUser(user) {
        const props = {
            user,
            selected: _.includes(selection, user.id),
            disabled: _.includes(disabled, user.id),
            env,
            onClick: handleUserClick,
        };
        return <User key={user.id} {...props} />
    }
}

function User(props) {
    const { user, env, disabled, onClick } = props;
    const classNames = [ 'user' ];
    if (props.selected) {
        classNames.push('selected');
    }
    if (props.disabled) {
        classNames.push('disabled');
    }
    const name = UserUtils.getDisplayName(user, env);
    let containerProps = {
        className: classNames.join(' '),
        'data-user-id': user.id,
        onClick: !disabled ? onClick : null,
    };
    const imageProps = { user, env, size: 'small' };
    return (
        <div {...containerProps}>
            <ProfileImage {...imageProps} />
            <span className="name">{name}</span>
            <i className="fa fa-check-circle" />
        </div>
    );
}

const sortUsers = memoizeWeak(null, function(users, env) {
    let { p } = env.locale;
    let name = (user) => {
        return p(user.details.name);
    };
    return _.orderBy(users, [ name ], [ 'asc' ]);
});

const component = Relaks.memo(UserSelectionList);

export {
    component as default,
    component as UserSelectionList,
};
