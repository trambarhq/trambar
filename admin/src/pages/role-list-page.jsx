var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var RoleSummaryPage = require('pages/role-summary-page');

// widgets
var PushButton = require('widgets/push-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;

require('./role-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'RolesPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('/roles/', url);
        },

        getUrl: function(params) {
            return `/roles/`;
        },
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            roles: null,
            currentUser: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RoleListPageSync {...props} />);
        return db.start().then((roleId) => {
            return <RoleListPageSync {...props} />;
        });

        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            roles: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RoleListPageSync {...props} />);
        return db.start().then((userId) => {
            // load all roles
            var criteria = {};
            return db.find({ schema: 'global', table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            meanwhile.show(<RoleListPageSync {...props} />);
        }).then(() => {
            var criteria = {
                role_ids: _.flatten(_.map(props.roles, 'id')),
            };
        }).then((users) => {
            props.users = users;
            return <RoleListPageSync {...props} />;
        });

    }
});

var RoleListPageSync = module.exports.Sync = React.createClass({
    displayName: 'RoleListPage.Sync',
    propTypes: {
        roles: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

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
            <div className="role-list-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('role-list-new')}
                </PushButton>
                <h2>{t('role-list-title')}</h2>
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
        var roles = sortRoles(this.props.roles, this.props.users, this.props.locale, this.state.sortColumns, this.state.sortDirections);
        return (
            <SortableTable {...tableProps}>
                <thead>
                    <tr>
                        <TH id="title">{t('table-heading-name')}</TH>
                        <TH id="mtime">{t('table-heading-last-modified')}</TH>
                    </tr>
                </thead>
                <tbody>
                    {_.map(roles, this.renderRow)}
                </tbody>
            </SortableTable>
        );
    },

    renderRow: function(role, i) {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var title = p(role.details.title) || 'no title';
        var mtime = Moment(role.mtime).fromNow();
        var url = RoleSummaryPage.getUrl({ roleId: role.id });
        return (
            <tr key={i}>
                <td>
                    <a href={url} onClick={this.handleLinkClick}>
                        {title}
                    </a>
                </td>
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

    handleLinkClick: function(evt) {
        var url = evt.target.getAttribute('href');
        this.props.route.change(url);
        evt.preventDefault();
    },
});

var sortRoles = Memoize(function(roles, users, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (role) => {
                    return locale.pick(role.details.title)
                };
            default:
                return column;
        }
    });
    return _.orderBy(roles, columns, directions);
});
