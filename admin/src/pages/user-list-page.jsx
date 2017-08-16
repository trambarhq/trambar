var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;

require('./user-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'UserListPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('/users/', url);
        },

        getUrl: function(params) {
            return `/users/`;
        },
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            users: null,
            projects: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<UserListPageSync {...props} />);
        return db.start().then((userId) => {
            // load all users
            var criteria = {};
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            meanwhile.show(<UserListPageSync {...props} />);
        }).then(() => {
            // load projects
            var criteria = {
                id: _.flatten(_.map(props.users, 'project_ids'))
            };
            return db.find({ schema: 'global', table: 'project', criteria });
        }).then((projects) => {
            props.projects = projects;
            return <UserListPageSync {...props} />;
        });
    }
});

var UserListPageSync = module.exports.Sync = React.createClass({
    displayName: 'UserListPage.Sync',
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object),
        projects: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
        };
    },

    render: function() {
        var t = this.props.locale.translate;
        return (
            <div>
                <h2>{t('user-list-title')}</h2>
                {this.renderTable()}
            </div>
        );
    },

    renderTable: function() {
        var t = this.props.locale.translate;
        var tableProps = {
            className: 'users',
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        var users = sortUsers(this.props.users, this.props.projects, this.props.locale, this.state.sortColumns, this.state.sortDirections);
        return (
            <SortableTable {...tableProps}>
                <thead>
                    <tr>
                        <TH id="name">{t('table-heading-personal-name')}</TH>
                        <TH id="username">{t('table-heading-username')}</TH>
                        <TH id="mtime">{t('table-heading-last-modified')}</TH>
                    </tr>
                </thead>
                <tbody>
                    {_.map(users, this.renderRow)}
                </tbody>
            </SortableTable>
        );
    },

    renderRow: function(user, i) {
        var p = this.props.locale.pick;
        var name = user.details.name;
        var username = user.username;
        var mtime = Moment(user.mtime).fromNow();
        return (
            <tr key={i}>
                <td>{name}</td>
                <td>{username}</td>
                <td>{mtime}</td>
            </tr>
        );
    },

    handleSort: function(evt) {
        this.setState({
            sortColumns: evt.columns,
            sortDirections: evt.directions
        });
    }
});

var sortUsers = Memoize(function(users, projects, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return (user) => {
                    if (user.details.last_name) {
                        return user.details.last_name;
                    } else {
                        var names = _.split(user.details.name);
                        return _.last(names);
                    }
                };
            default:
                return column;
        }
    });
    return _.orderBy(users, columns, directions);
});
