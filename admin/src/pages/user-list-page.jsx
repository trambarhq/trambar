var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var UserSummaryPage = require('pages/user-summary-page');

// widgets
var PushButton = require('widgets/push-button');
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
            <div className="user-list-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('user-list-new')}
                </PushButton>
                <h2>{t('user-list-title')}</h2>
                {this.renderTable()}
            </div>
        );
    },

    renderTable: function() {
        var t = this.props.locale.translate;
        var tableProps = {
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
        var url = UserSummaryPage.getUrl({ userId: user.id });
        return (
            <tr key={i}>
                <td>
                    <a href={url}>
                        {name}
                    </a>
                </td>
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
    },
});

var sortUsers = Memoize(function(users, projects, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return 'details.name';
            default:
                return column;
        }
    });
    return _.orderBy(users, columns, directions);
});
