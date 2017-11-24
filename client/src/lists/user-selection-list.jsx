var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var ProfileImage = require('widgets/profile-image');

require('./user-selection-list.scss');

module.exports = Relaks.createClass({
    displayName: 'UserSelectionList',
    propTypes: {
        selection: PropTypes.arrayOf(PropTypes.number),
        disabled: PropTypes.arrayOf(PropTypes.number),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelect: PropTypes.func,
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            users: null,

            selection: this.props.selection,
            disabled: this.props.disabled,
            locale: this.props.locale,
            theme: this.props.theme,
            onSelect: this.props.onSelect,
            loading: true,
        };
        meanwhile.show(<UserSelectionListSync {...props} />, 250);
        return db.start().then((userId) => {
            // load users who aren't hidden
            var criteria = {
                hidden: false
            };
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            props.loading = false;
            return <UserSelectionListSync {...props} />
        });
    }
});

var UserSelectionListSync = module.exports.Sync = React.createClass({
    displayName: 'UserSelectionList.Sync',
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object),
        selection: PropTypes.arrayOf(PropTypes.number),
        disabled: PropTypes.arrayOf(PropTypes.number),

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelect: PropTypes.func,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var users = sortUsers(this.props.users, this.props.locale);
        return (
            <div className="user-selection-list">
                {_.map(users, this.renderUser)}
            </div>
        );
    },

    /**
     * Render a user's name and profile picture
     *
     * @return {ReactElement}
     */
    renderUser: function(user) {
        var props = {
            user,
            selected: _.includes(this.props.selection, user.id),
            disabled: _.includes(this.props.disabled, user.id),
            locale: this.props.locale,
            theme: this.props.theme,
            onClick: this.handleUserClick,
        };
        return <User key={user.id} {...props} />
    },

    /**
     * Inform parent component that the selection has changed
     *
     * @param  {Array<Number>} selection
     */
    triggerSelectEvent: function(selection) {
        if (this.props.onSelect) {
            this.props.onSelect({
                type: 'select',
                target: this,
                selection,
            });
        }
    },

    /**
     * Called when user clicks on a user
     *
     * @param  {Event} evt
     */
    handleUserClick: function(evt) {
        var userId = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        var selection = this.props.selection;
        if (_.includes(selection, userId)) {
            selection = _.difference(selection, [ userId ]);
        } else {
            selection = _.union(selection, [ userId ]);
        }
        this.triggerSelectEvent(selection);
    }
});

function User(props) {
    var p = props.locale.pick;
    var classNames = [ 'user' ];
    if (props.selected) {
        classNames.push('selected');
    }
    if (props.disabled) {
        classNames.push('disabled');
    }
    var name = p(props.user.details.name);
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
