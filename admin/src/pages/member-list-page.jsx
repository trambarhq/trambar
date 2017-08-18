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

require('./member-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'MemberListPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('/projects/:projectId/members/', url);
        },

        getUrl: function(params) {
            return `/projects/${params.projectId}/members/`;
        },
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            project: null,
            users: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<MemberListPageSync {...props} />);
        return db.start().then((userId) => {
            // load project
            var criteria = {
                id: this.props.route.parameters.projectId
            };
            return db.findOne({ schema: 'global', table: 'project', criteria });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load members
            var criteria = {
                project_ids: [ props.project.id ]
            };
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            meanwhile.show(<MemberListPageSync {...props} />);
        }).then((projects) => {
            props.projects = projects;
            return <MemberListPageSync {...props} />;
        });
    }
});

var MemberListPageSync = module.exports.Sync = React.createClass({
    displayName: 'MemberListPage.Sync',
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object,

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
            <div className="member-list-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('member-list-new')}
                </PushButton>
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('member-list-edit')}
                </PushButton>
                <h2>{t('member-list-title')}</h2>
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
        var projectId = this.props.route.parameters.projectId;
        var name = user.details.name;
        var username = user.username;
        var mtime = Moment(user.mtime).fromNow();
        var url = UserSummaryPage.getUrl({ projectId: projectId, userId: user.id });
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
