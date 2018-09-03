import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Memoize from 'utils/memoize';
import ProjectFinder from 'objects/finders/project-finder';
import UserFinder from 'objects/finders/user-finder';
import UserUtils from 'objects/utils/user-utils';

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
        var params = this.props.route.parameters;
        var db = this.props.database.use({ by: this });
        var props = {
            users: null,

            selection: this.props.selection,
            disabled: this.props.disabled,
            locale: this.props.locale,
            theme: this.props.theme,
            onSelect: this.props.onSelect,
        };
        meanwhile.show(<UserSelectionListSync {...props} />);
        return db.start().then((currentUserId) => {
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

class UserSelectionListSync extends PureComponent {
    static displayName = 'UserSelectionList.Sync';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var users = sortUsers(this.props.users, this.props.locale);
        return (
            <div className="user-selection-list">
                {_.map(users, this.renderUser)}
            </div>
        );
    }

    /**
     * Render a user's name and profile picture
     *
     * @return {ReactElement}
     */
    renderUser(user) {
        var props = {
            user,
            selected: _.includes(this.props.selection, user.id),
            disabled: _.includes(this.props.disabled, user.id),
            locale: this.props.locale,
            theme: this.props.theme,
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
        if (this.props.onSelect) {
            this.props.onSelect({
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
        var userId = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        var selection = this.props.selection;
        if (_.includes(selection, userId)) {
            selection = _.difference(selection, [ userId ]);
        } else {
            selection = _.union(selection, [ userId ]);
        }
        this.triggerSelectEvent(selection);
    }
}

function User(props) {
    var classNames = [ 'user' ];
    if (props.selected) {
        classNames.push('selected');
    }
    if (props.disabled) {
        classNames.push('disabled');
    }
    var name = UserUtils.getDisplayName(props.user, props.locale);
    var containerProps = {
        className: classNames.join(' '),
        'data-user-id': props.user.id,
        onClick: !props.disabled ? props.onClick : null,
    };
    var imageProps = {
        user: props.user,
        theme: props.theme,
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

var sortUsers = Memoize(function(users, locale) {
    var p = locale.pick;
    var name = (user) => {
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
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserSelectionList.propTypes = {
        selection: PropTypes.arrayOf(PropTypes.number),
        disabled: PropTypes.arrayOf(PropTypes.number),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelect: PropTypes.func,
    };
    UserSelectionListSync.propTypes = {
        users: PropTypes.arrayOf(PropTypes.object),
        selection: PropTypes.arrayOf(PropTypes.number),
        disabled: PropTypes.arrayOf(PropTypes.number),

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelect: PropTypes.func,
    };
}
