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
var PushButton = require('widgets/push-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var ModifiedTimeTooltip = require('widgets/modified-time-tooltip')

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
        /**
         * Match current URL against the page's
         *
         * @param  {String} url
         *
         * @return {Object|null}
         */
        parseUrl: function(url) {
            return Route.match('/servers/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         * @param  {Object} query
         *
         * @return {String}
         */
        getUrl: function(params, query) {
            return `/servers/`;
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
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

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <div className="server-list-page">
                {this.renderButtons()}
                <h2>{t('server-list-title')}</h2>
                {this.renderTable()}
            </div>
        );
    },

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        return (
            <div className="buttons">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('server-list-new')}
                </PushButton>
            </div>
        );
    },

    /**
     * Render a table
     *
     * @return {ReactElement}
     */
    renderTable: function() {
        var t = this.props.locale.translate;
        var tableProps = {
            className: 'servers',
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        return (
            <SortableTable {...tableProps}>
                <thead>
                    {this.renderHeadings()}
                </thead>
                <tbody>
                    {this.renderRows()}
                </tbody>
            </SortableTable>
        );
    },

    /**
     * Render table headings
     *
     * @return {ReactElement}
     */
    renderHeadings: function() {
        return (
            <tr>
                {this.renderTitleColumn()}
                {this.renderTypeColumn()}
                {this.renderModifiedTimeColumn()}
            </tr>
        );
    },

    /**
     * Render table rows
     *
     * @return {Array<ReactElement>}
     */
    renderRows: function() {
        var servers = sortServers(
            this.props.servers,
            this.props.projects,
            this.props.locale,
            this.state.sortColumns,
            this.state.sortDirections
        );
        return _.map(servers, this.renderRow);
    },

    /**
     * Render a table row
     *
     * @param  {Object} server
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderRow: function(server, i) {
        return (
            <tr key={i}>
                {this.renderTitleColumn(server)}
                {this.renderTypeColumn(server)}
                {this.renderModifiedTimeColumn(server)}
            </tr>
        );
    },

    /**
     * Render title column, either the heading or a data cell
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement}
     */
    renderTitleColumn: function(server) {
        var t = this.props.locale.translate;
        if (!server) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            var p = this.props.locale.pick;
            var title = p(server.details.title) || t(`server-type-${server.type}`);
            var url = require('pages/server-summary-page').getUrl({
                serverId: server.id
            });
            return (
                <td>
                    <a href={url}>
                        <i className={`fa fa-${server.type} fa-fw`} />
                        {' '}
                        {title}
                    </a>
                </td>
            );
        }
    },

    /**
     * Render type column, either the heading or a data cell
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement}
     */
    renderTypeColumn: function(server) {
        var t = this.props.locale.translate;
        if (!server) {
            return <TH id="type">{t('table-heading-type')}</TH>;
        } else {
            return <td>{t(`server-type-${server.type}`)}</td>
        }
    },

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn: function(server) {
        if (this.props.theme.isBelowMode('standard')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!server) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            return <td><ModifiedTimeTooltip time={server.mtime} /></td>;
        }
    },

    /**
     * Called when user clicks a table heading
     *
     * @param  {Object} evt
     */
    handleSort: function(evt) {
        this.setState({
            sortColumns: evt.columns,
            sortDirections: evt.directions
        });
    },
});

var sortServers = Memoize(function(servers, projects, locale, columns, directions) {
    var t = locale.translate;
    var p = locale.pick;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (server) => {
                    return p(server.details.title) || t(`server-type-${server.type}`);
                };
            case 'type':
                return (server) => {
                    return t(`server-type-${server.type}`);
                };
            default:
                return column;
        }
    });
    return _.orderBy(servers, columns, directions);
});
