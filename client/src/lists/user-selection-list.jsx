import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as UserFinder from 'objects/finders/user-finder';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import ProfileImage from 'widgets/profile-image';

require('./user-selection-list.scss');

class UserSelectionList extends AsyncComponent {
    static displayName = 'UserSelectionList';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let {
            database,
            route,
            env,
            selection,
            disabled,
            onSelect,
        } = this.props;
        let db = database.use({ by: this });
        let props = {
            users: null,

            selection,
            disabled,
            env,
            onSelect,
        };
        meanwhile.show(<UserSelectionListSync {...props} />);
        return db.start().then((currentUserID) => {
            return ProjectFinder.findCurrentProject(db).then((project) => {
                return UserFinder.findProjectMembers(db, project).then((users) => {
                    props.users = users;
                });
            });
        }).then(() => {
            return <UserSelectionListSync {...props} />
        });
    }
}

/**
 * Synchronous component that actually renders the list.
 *
 * @extends PureComponent
 */
class UserSelectionListSync extends PureComponent {
    static displayName = 'UserSelectionList.Sync';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env, users } = this.props;
        users = sortUsers(users, env);
        return (
            <div className="user-selection-list">
            {
                _.map(users, (user) => {
                    return this.renderUser(user);
                })
            }
            </div>
        );
    }

    /**
     * Render a user's name and profile picture
     *
     * @return {ReactElement}
     */
    renderUser(user) {
        let { env, selection, disabled } = this.props;
        let props = {
            user,
            selected: _.includes(selection, user.id),
            disabled: _.includes(disabled, user.id),
            env,
            onClick: this.handleUserClick,
        };
        return <User key={user.id} {...props} />
    }

    /**
     * Inform parent component that the selection has changed
     *
     * @param  {Array<Number>} selection
     */
    triggerSelectEvent(selection) {
        let { onSelect } = this.props;
        if (onSelect) {
            onSelect({
                type: 'select',
                target: this,
                selection,
            });
        }
    }

    /**
     * Called when user clicks on a user
     *
     * @param  {Event} evt
     */
    handleUserClick = (evt) => {
        let { selection } = this.props;
        let userID = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        if (_.includes(selection, userID)) {
            selection = _.without(selection, userID);
        } else {
            selection = _.concat(selection, userID);
        }
        this.triggerSelectEvent(selection);
    }
}

function User(props) {
    let { user, env, disabled, onClick } = props;
    let classNames = [ 'user' ];
    if (props.selected) {
        classNames.push('selected');
    }
    if (props.disabled) {
        classNames.push('disabled');
    }
    let name = UserUtils.getDisplayName(user, env);
    let containerProps = {
        className: classNames.join(' '),
        'data-user-id': user.id,
        onClick: !disabled ? onClick : null,
    };
    let imageProps = {
        user,
        env,
        size: 'small',
    };
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

export {
    UserSelectionList as default,
    UserSelectionList,
    UserSelectionListSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserSelectionList.propTypes = {
        selection: PropTypes.arrayOf(PropTypes.number),
        disabled: PropTypes.arrayOf(PropTypes.number),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onSelect: PropTypes.func,
    };
    UserSelectionListSync.propTypes = {
        users: PropTypes.arrayOf(PropTypes.object),
        selection: PropTypes.arrayOf(PropTypes.number),
        disabled: PropTypes.arrayOf(PropTypes.number),

        env: PropTypes.instanceOf(Environment).isRequired,

        onSelect: PropTypes.func,
    };
}
