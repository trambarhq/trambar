var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var ServerSummaryPage = require('pages/server-summary-page');

// widgets
var PushButton = require('widgets/push-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;

require('./server-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'ServerListPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('/servers/', url);
        },

        getUrl: function(params) {
            return `/servers/`;
        },
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            servers: null,
            projects: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ServerListPageSync {...props} />);
        return db.start().then((userId) => {
            // load all servers
            var criteria = {};
            return db.find({ schema: 'global', table: 'server', criteria });
        }).then((servers) => {
            props.servers = servers;
            return <ServerListPageSync {...props} />;
        });
    }
});

var ServerListPageSync = module.exports.Sync = React.createClass({
    displayName: 'ServerListPage.Sync',
    propTypes: {
        servers: PropTypes.arrayOf(PropTypes.object),
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
            <div className="server-list-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('server-list-new')}
                </PushButton>
                <h2>{t('server-list-title')}</h2>
                {this.renderTable()}
            </div>
        );
    },

    renderTable: function() {
        var t = this.props.locale.translate;
        var tableProps = {
            className: 'servers',
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        var servers = sortServers(this.props.servers, this.props.projects, this.props.locale, this.state.sortColumns, this.state.sortDirections);
        return (
            <SortableTable {...tableProps}>
                <thead>
                    <tr>
                        <TH id="name">{t('table-heading-name')}</TH>
                        <TH id="type">{t('table-heading-type')}</TH>
                        <TH id="mtime">{t('table-heading-last-modified')}</TH>
                    </tr>
                </thead>
                <tbody>
                    {_.map(servers, this.renderRow)}
                </tbody>
            </SortableTable>
        );
    },

    renderRow: function(server, i) {
        var p = this.props.locale.pick;
        var name = server.details.name;
        var type = server.type;
        var mtime = Moment(server.mtime).fromNow();
        var url = ServerSummaryPage.getUrl({ serverId: server.id });
        return (
            <tr key={i}>
                <td>
                    <a href={url}>
                        {name}
                    </a>
                </td>
                <td>{type}</td>
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

var sortServers = Memoize(function(servers, projects, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return 'details.last_name';
            default:
                return column;
        }
    });
    return _.orderBy(servers, columns, directions);
});
